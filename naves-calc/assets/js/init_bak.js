$(document).ready(function ($) {

    $(document).on('click', '.js_open_popup', function (e) {
        e.preventDefault();
        const id = $(this).attr('href');
        $(id).addClass('active');
    });
    $('[data-svg]').not('loaded').each(function () {
        var $i = $(this).addClass('loaded');

        $.get($i.data('svg'), function (data) {
            var $svg = $(data).find('svg');

            $svg.attr('class', $i.attr('class'));
            $i.replaceWith($svg);
        }, 'xml');
    });

    $('.specification dt').click(function () {
        $(this).toggleClass('active');
        $(this).parent().find('dd').toggle('fast');
    });
    $('.triger-open').click(function () {
        $(this).toggleClass('active');
        $(this).parent().find('.calculator-hide-info').toggle('fast');
    });
    $('.usually dt').click(function () {
        $(this).toggleClass('active');
        $(this).parent().find('dd').toggle('fast');
    });
    $('.open-menu').click(function () {
        $('.header-top').addClass('active');
    });
    $('.header-top-close').click(function () {
        $('.header-top').removeClass('active');
    });


    $(".has-slider").each(function () {
        var $this = $(this);
        var min = $this.data("min") || 1;
        var max = $this.data("max") || 22;
        var value = $this.data("value") || min; // Если data-value нет, берем min

        var $slider = $this.find(".slider"); // Находим слайдер внутри текущего блока

        $slider.slider({
            range: "min",
            min: min,
            max: max,
            value: value,
            slide: function (event, ui) {
                $this.find(".value span").text(ui.value);
            }
        });

        $slider.on("touchstart touchmove touchend", function (e) {
            e.stopPropagation();
            e.preventDefault();
        });
    });
    //$("select").selectmenu();
    let openSelectMenu = null;

    $("select").selectmenu({
        open: function (event, ui) {
            if (openSelectMenu && openSelectMenu !== this) {
                $(openSelectMenu).selectmenu("close");
            }
            openSelectMenu = this;
        },
        close: function () {
            openSelectMenu = null;
        }
    });

    $(".faq .title").on("click", function () {
        var $accordionItem = $(this).parents(".faq-item");
        var $info = $accordionItem.find(".txt");

        if ($accordionItem.hasClass("active")) {
            $accordionItem.removeClass("active");
            $info.slideUp();
        } else {
            $accordionItem.addClass("active");
            $info.stop(true, true).slideDown();
            $accordionItem.siblings(".active").removeClass("active").children(".txt").stop(true, true).slideUp();
        }
    });
    let $items = $(".project-row .project-item");
    let $button = $(".project-button button");
    let visibleCount = 6;

    $items.slice(visibleCount).hide();

    $button.on("click", function () {
        if ($items.slice(visibleCount).is(":hidden")) {
            $items.slice(visibleCount).slideDown();
            $button.contents().filter(function () {
                return this.nodeType === 3; // Выбираем только текстовый узел
            }).replaceWith(" Закрыть "); // Меняем только текст
        } else {
            $items.slice(visibleCount).slideUp();
            $button.contents().filter(function () {
                return this.nodeType === 3;
            }).replaceWith(" Показать еще "); // Меняем обратно
        }
    });

    if ($(window).width() < 992) {

        var $menuWrapper = $("<div class='header-menu-wrapper'></div>");

        var $menu = $(".header .header-menu");
        $menuWrapper.append($menu);

        $(".header-top .wrap-cont").append($menuWrapper);

        $(".header .header-menu").remove();

        $(".footer-col .name").on("click", function () {
            $(this).next("ul").slideToggle();
            $(this).toggleClass('active');
        });

    }


});

document.addEventListener("DOMContentLoaded", function() {
    let dropArea = document.getElementById("dropArea");
    let fileInput = document.getElementById("fileInput");
    let fileList = document.getElementById("fileList");


    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }


    dropArea.addEventListener("drop", function(e) {
        let files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener("change", function(e) {
        handleFiles(fileInput.files);
    });

    function handleFiles(files) {
        fileList.innerHTML = ""; // Очищаем список перед добавлением новых файлов

        for (let file of files) {
            let listItem = document.createElement("li");
            listItem.textContent = file.name;
            fileList.appendChild(listItem);
        }
    }





    const stickyBlock = document.querySelector(".calculator-right-img-block");
    const parent = document.querySelector(".calculator-right");
    const header = document.querySelector(".header_wrap");
    const fixStop = document.querySelector(".fixed-img-stop");

    // Функция обновления позиции sticky-блока
    function updateStickyPosition() {
        const parentRect = parent.getBoundingClientRect();
        const stickyHeight = stickyBlock.offsetHeight;
        const viewportHeight = window.innerHeight;
        const headerHeight = header ? header.offsetHeight : 0;
        const offsetTopFix = 30;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const parentTop = parent.offsetTop - headerHeight - offsetTopFix;
        const bodyCalc = document.querySelector("body");

        const fixStopRect = fixStop.getBoundingClientRect();
        const fixStopTop = fixStopRect.top + window.scrollY;

        if (window.innerWidth < 992) {
            if (scrollTop > parentTop + stickyHeight) {
                parent.classList.add("fixed-bl");
                bodyCalc.classList.add("fixed-bl-calc");
                parent.style.paddingTop = `${stickyHeight}px`;
            } else {
                parent.classList.remove("fixed-bl");
                bodyCalc.classList.remove("fixed-bl-calc");
                parent.style.paddingTop = "0px";
            }

            if (scrollTop + stickyHeight + offsetTopFix >= fixStopTop) {
                parent.classList.add("fixed-stop");
                bodyCalc.classList.add("fixed-bl-calc-stop");
            } else {
                parent.classList.remove("fixed-stop");
                bodyCalc.classList.remove("fixed-bl-calc-stop");
            }
        } else {
            parent.classList.remove("fixed-bl", "fixed-stop");
            bodyCalc.classList.remove("fixed-bl-calc", "fixed-bl-calc-stop");
            parent.style.paddingTop = "0px";

            let maxTranslate = parentRect.height - stickyHeight;
            let offsetTop = Math.max(0, Math.min(scrollTop - parent.offsetTop - headerHeight + offsetTopFix, maxTranslate));

            requestAnimationFrame(() => {
                stickyBlock.style.transform = `translateY(${offsetTop}px)`;
            });
        }
    }

    // Смотрим изменениее размеров `.calculator-right`
    const resizeObserver = new ResizeObserver(() => {
        updateStickyPosition();
    });
    resizeObserver.observe(parent);

    // Слушаем скролл и изменение размера окна
    window.addEventListener("scroll", updateStickyPosition);
    window.addEventListener("resize", updateStickyPosition);
    updateStickyPosition();




    document.querySelectorAll('.scroll-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Отменяем стандартное поведение ссылки
            const targetId = this.getAttribute('href').substring(1); // Получаем ID из href
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                let targetPosition = targetElement.getBoundingClientRect().top + window.scrollY; // Позиция элемента на странице

                if (window.innerWidth < 768 && targetId === 'smeta') {
                    targetPosition -= 260;
                }

                window.scrollTo({
                    top: targetPosition - 80, // Добавляем небольшой запас
                    behavior: 'smooth' // Плавная прокрутка
                });
            }
        });
    });





});
