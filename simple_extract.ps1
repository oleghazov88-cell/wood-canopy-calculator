# Simplified GLB extractor
param(
    [string]$GlbPath = "raskos/r2.glb",
    [string]$OutputPath = "naves-calc/assets/js/partGeometry.js"
)

$bytes = [System.IO.File]::ReadAllBytes($GlbPath)

# Read GLB header
$magic = [BitConverter]::ToUInt32($bytes, 0)
$version = [BitConverter]::ToUInt32($bytes, 4)
$length = [BitConverter]::ToUInt32($bytes, 8)

Write-Host "GLB version: $version, length: $length"

# Read JSON chunk
$offset = 12
$jsonLength = [BitConverter]::ToUInt32($bytes, $offset)
$jsonType = [BitConverter]::ToUInt32($bytes, $offset + 4)

$offset += 8
$jsonBytes = $bytes[$offset..($offset + $jsonLength - 1)]
$jsonString = [System.Text.Encoding]::UTF8.GetString($jsonBytes)

# Save JSON for inspection
$jsonString | Out-File "glb_structure.json" -Encoding UTF8

Write-Host "JSON structure saved to glb_structure.json"
Write-Host "Please review the file and I'll create the geometry code manually."

$gltf = $jsonString | ConvertFrom-Json

Write-Host ""
Write-Host "Meshes found:"
foreach ($mesh in $gltf.meshes) {
    Write-Host "  - $($mesh.name)"
    foreach ($prim in $mesh.primitives) {
        $posAccessor = $gltf.accessors[$prim.attributes.POSITION]
        Write-Host "    Vertices: $($posAccessor.count)"
        if ($prim.indices) {
            $idxAccessor = $gltf.accessors[$prim.indices]
            Write-Host "    Indices: $($idxAccessor.count)"
        }
    }
}

Write-Host ""
Write-Host "Materials:"
foreach ($mat in $gltf.materials) {
    Write-Host "  - $($mat.name)"
    if ($mat.pbrMetallicRoughness) {
        $pbr = $mat.pbrMetallicRoughness
        if ($pbr.baseColorFactor) {
            Write-Host "    Color: $($pbr.baseColorFactor -join ', ')"
        }
        if ($pbr.metallicFactor) {
            Write-Host "    Metalness: $($pbr.metallicFactor)"
        }
        if ($pbr.roughnessFactor) {
            Write-Host "    Roughness: $($pbr.roughnessFactor)"
        }
    }
}

$offset += $jsonLength

# Read BIN chunk
if ($offset -lt $bytes.Length) {
    $binLength = [BitConverter]::ToUInt32($bytes, $offset)
    $binType = [BitConverter]::ToUInt32($bytes, $offset + 4)
    
    $offset += 8
    $binBytes = $bytes[$offset..($offset + $binLength - 1)]
    
    Write-Host ""
    Write-Host "Binary data size: $binLength bytes"
    
    # Extract first mesh data
    $mesh = $gltf.meshes[0]
    $primitive = $mesh.primitives[0]
    
    # Get position data
    $posAccessor = $gltf.accessors[$prim.attributes.POSITION]
    $posBufferView = $gltf.bufferViews[$posAccessor.bufferView]
    $posByteOffset = $posBufferView.byteOffset
    if ($posAccessor.byteOffset) {
        $posByteOffset += $posAccessor.byteOffset
    }
    
    $vertexCount = $posAccessor.count
    Write-Host "Extracting $vertexCount vertices..."
    
    # Start building the code file
    $code = New-Object System.Text.StringBuilder
    $null = $code.AppendLine("// Auto-generated from GLB file: $GlbPath")
    $null = $code.AppendLine("// Mesh: $($mesh.name)")
    $null = $code.AppendLine("// Vertices: $vertexCount")
    $null = $code.AppendLine()
    $null = $code.AppendLine("import * as THREE from 'three';")
    $null = $code.AppendLine()
    $null = $code.AppendLine("export function createPartMesh() {")
    $null = $code.AppendLine("    const geometry = new THREE.BufferGeometry();")
    $null = $code.AppendLine()
    $null = $code.AppendLine("    // Position attribute ($vertexCount vertices)")
    $null = $code.AppendLine("    const positions = new Float32Array([")
    
    # Extract position data
    $posOffset = $posByteOffset
    for ($i = 0; $i -lt $vertexCount; $i++) {
        $x = [BitConverter]::ToSingle($binBytes, $posOffset)
        $y = [BitConverter]::ToSingle($binBytes, $posOffset + 4)
        $z = [BitConverter]::ToSingle($binBytes, $posOffset + 8)
        $posOffset += 12
        
        $comma = if ($i -lt $vertexCount - 1) { "," } else { "" }
        $culture = [System.Globalization.CultureInfo]::InvariantCulture
        $xStr = $x.ToString("F6", $culture)
        $yStr = $y.ToString("F6", $culture)
        $zStr = $z.ToString("F6", $culture)
        $null = $code.AppendLine("        $xStr, $yStr, $zStr$comma")
    }
    
    $null = $code.AppendLine("    ]);")
    $null = $code.AppendLine("    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));")
    $null = $code.AppendLine()
    
    # Extract normals if present
    if ($primitive.attributes.NORMAL) {
        $normAccessor = $gltf.accessors[$primitive.attributes.NORMAL]
        $normBufferView = $gltf.bufferViews[$normAccessor.bufferView]
        $normByteOffset = $normBufferView.byteOffset
        if ($normAccessor.byteOffset) {
            $normByteOffset += $normAccessor.byteOffset
        }
        
        $null = $code.AppendLine("    // Normal attribute")
        $null = $code.AppendLine("    const normals = new Float32Array([")
        
        $normOffset = $normByteOffset
        for ($i = 0; $i -lt $vertexCount; $i++) {
            $x = [BitConverter]::ToSingle($binBytes, $normOffset)
            $y = [BitConverter]::ToSingle($binBytes, $normOffset + 4)
            $z = [BitConverter]::ToSingle($binBytes, $normOffset + 8)
            $normOffset += 12
            
            $comma = if ($i -lt $vertexCount - 1) { "," } else { "" }
            $culture = [System.Globalization.CultureInfo]::InvariantCulture
            $xStr = $x.ToString("F6", $culture)
            $yStr = $y.ToString("F6", $culture)
            $zStr = $z.ToString("F6", $culture)
            $null = $code.AppendLine("        $xStr, $yStr, $zStr$comma")
        }
        
        $null = $code.AppendLine("    ]);")
        $null = $code.AppendLine("    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));")
        $null = $code.AppendLine()
    }
    
    # Extract indices if present (indices can be 0, so check explicitly)
    if ($primitive.PSObject.Properties['indices']) {
        $idxAccessor = $gltf.accessors[$primitive.indices]
        $idxBufferView = $gltf.bufferViews[$idxAccessor.bufferView]
        $idxByteOffset = $idxBufferView.byteOffset
        if ($idxAccessor.byteOffset) {
            $idxByteOffset += $idxAccessor.byteOffset
        }
        
        $indexCount = $idxAccessor.count
        $triangleCount = [Math]::Floor($indexCount / 3)
        
        # Check component type: 5123 = Uint16, 5125 = Uint32
        $isUint32 = $idxAccessor.componentType -eq 5125
        $indexType = if ($isUint32) { "Uint32Array" } else { "Uint16Array" }
        $bytesPerIndex = if ($isUint32) { 4 } else { 2 }
        
        $null = $code.AppendLine("    // Index attribute ($indexCount indices, $triangleCount triangles)")
        $null = $code.AppendLine("    const indices = new $indexType([")
        
        $idxOffset = $idxByteOffset
        for ($i = 0; $i -lt $indexCount; $i += 3) {
            if ($isUint32) {
                $i0 = [BitConverter]::ToUInt32($binBytes, $idxOffset)
                $i1 = [BitConverter]::ToUInt32($binBytes, $idxOffset + 4)
                $i2 = [BitConverter]::ToUInt32($binBytes, $idxOffset + 8)
                $idxOffset += 12
            } else {
                $i0 = [BitConverter]::ToUInt16($binBytes, $idxOffset)
                $i1 = [BitConverter]::ToUInt16($binBytes, $idxOffset + 2)
                $i2 = [BitConverter]::ToUInt16($binBytes, $idxOffset + 4)
                $idxOffset += 6
            }
            
            $comma = if ($i + 3 -lt $indexCount) { "," } else { "" }
            $null = $code.AppendLine("        $i0, $i1, $i2$comma")
        }
        
        $null = $code.AppendLine("    ]);")
        $null = $code.AppendLine("    geometry.setIndex(new THREE.BufferAttribute(indices, 1));")
        $null = $code.AppendLine()
    }
    
    # Add material
    $materialIndex = if ($primitive.material -ne $null) { $primitive.material } else { 0 }
    
    $hasMaterial = $false
    if ($gltf.materials -and $materialIndex -lt $gltf.materials.Count) {
        $material = $gltf.materials[$materialIndex]
        $hasMaterial = $true
    }
    
    if ($hasMaterial) {
        $null = $code.AppendLine("    // Material: $($material.name)")
    } else {
        $null = $code.AppendLine("    // Material: Default wood")
    }
    
    $null = $code.AppendLine("    const material = new THREE.MeshStandardMaterial({")
    
    if ($hasMaterial -and $material.pbrMetallicRoughness) {
        $pbr = $material.pbrMetallicRoughness
        $culture = [System.Globalization.CultureInfo]::InvariantCulture
        
        if ($pbr.baseColorFactor) {
            $r = $pbr.baseColorFactor[0].ToString("F3", $culture)
            $g = $pbr.baseColorFactor[1].ToString("F3", $culture)
            $b = $pbr.baseColorFactor[2].ToString("F3", $culture)
            $null = $code.AppendLine("        color: new THREE.Color($r, $g, $b),")
        }
        
        if ($pbr.metallicFactor -ne $null) {
            $m = $pbr.metallicFactor.ToString("F3", $culture)
            $null = $code.AppendLine("        metalness: $m,")
        }
        
        if ($pbr.roughnessFactor -ne $null) {
            $r = $pbr.roughnessFactor.ToString("F3", $culture)
            $null = $code.AppendLine("        roughness: $r,")
        }
    } else {
        # Default material properties for wood
        $null = $code.AppendLine("        color: 0x8B4513,")
        $null = $code.AppendLine("        roughness: 0.8,")
        $null = $code.AppendLine("        metalness: 0.0,")
    }
    
    $null = $code.AppendLine("    });")
    $null = $code.AppendLine()
    $null = $code.AppendLine("    const mesh = new THREE.Mesh(geometry, material);")
    $null = $code.AppendLine()
    $null = $code.AppendLine("    return mesh;")
    $null = $code.AppendLine("}")
    $null = $code.AppendLine()
    $null = $code.AppendLine("// Usage example:")
    $null = $code.AppendLine("// import { createPartMesh } from './partGeometry.js';")
    $null = $code.AppendLine("// const mesh = createPartMesh();")
    $null = $code.AppendLine("// scene.add(mesh);")
    
    # Save the code
    $code.ToString() | Out-File -FilePath $OutputPath -Encoding UTF8
    
    Write-Host ""
    Write-Host "Success! Generated code saved to: $OutputPath" -ForegroundColor Green
}

