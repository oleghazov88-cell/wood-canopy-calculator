import pandas as pd
import os
import sys

file_path = r'c:\Users\OLEG\Desktop\AZ\wood_canopy_calc\naves-calc\upload\naves\PRICE1.xlsm'

try:
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    print(f"Analyzing {file_path}...")
    
    # Load Excel file (requires openpyxl)
    xl = pd.ExcelFile(file_path)
    
    print(f"Sheet names: {xl.sheet_names}")
    
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = xl.parse(sheet)
        print(f"Shape: {df.shape}")
        print("First 5 rows:")
        print(df.head().to_string())
        print("\nColumns:")
        print(list(df.columns))

except Exception as e:
    print(f"Error reading Excel file: {e}")
