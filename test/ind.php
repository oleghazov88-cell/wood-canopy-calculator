<?
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/header.php");
use Bitrix\Main\Page\Asset;
$APPLICATION->SetTitle("Калькулятор навесов");

Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . "/css/calc/fonts/stylesheet.css", true);
Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . "/js/calc/jquery-ui-1.14.1/jquery-ui.min.css", true);
Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . "/css/calc/style.css", true);
Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . "/css/calc/responsive.css", true);
$APPLICATION->SetPageProperty("wrapper_class", 'full-w-wrapper calc-page-wrapper');

//global $USER;
//$USER->Authorize(1);
?>


<form id="form1">
    <div class="wrap-cont oh">
        <div class="f2 title-f2 fz25 fw600 ttu lh mb-20 hide_cl show_992">Калькулятор
            <br> расчета навеса</div>
        <section class="calculator-row flex gap-40 mb-60 mb-20m">
            <div class="calculator-left fxg">
                <div class="f2 title-f2 fz40 fw600 ttu lh mb-55 hide_992">Калькулятор
                    <br> расчета навеса</div>
                <div class="calculator-date">
                    <dl class="calculator-date-item calculator-date-item--type mb-55">
                        <dt class="name f2 fz16 fw600 ttu lh130 mb-30">форма навеса</dt>
                        <dd class="type-row-raido flex fxww gap-20">
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="arched" data-status=""  onclick="setActive(this);">
                                    <input checked class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-1">
                                    <label for="type-karkas-var-1" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/1.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="SemiArc" data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-2">
                                    <label for="type-karkas-var-2" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/2.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="singlePitched"  data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-3">
                                    <label for="type-karkas-var-3" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/3.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="singlePitchedTriangular" data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-4">
                                    <label for="type-karkas-var-4" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/4.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="singlePitchedСhannel" data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-5">
                                    <label for="type-karkas-var-5" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/5.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type"  data-value="gable" data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-6">
                                    <label for="type-karkas-var-6" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/6.svg'></i>
                                    </label>
                                </div>
                            </div>
                            <div class="type-row-raido-col">
                                <div class="raido-image" data-id="type" data-value="gableArchedBase" data-status="" onclick="setActive(this);">
                                    <input class="hide_cl" type="radio" name="type-karkas" id="type-karkas-var-7">
                                    <label for="type-karkas-var-7" class="flex aic jcc round-10 bg-f5 pointer">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/naves/7.svg'></i>
                                    </label>
                                </div>
                            </div>
                        </dd>
                    </dl>
                    <div class="calculator-list flex fxww gap-20 rgap-30 mb-35 mb-20m">
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">длина, м - новая ш-0,1</dt>
                            <dd class="has-slider bg-f9 round-10 flex aic jcsb posr" >
                                <div class="ot path fz17"><span>от</span>1м</div>
                                <div class="value-calc-wrap">
                                    <div class="btn-input btn-minus">-</div>
                                    <input  id="lengthByPillars" class="value-calc no-btn fz20 fw600 center" type="number" name="dlina" step="0.1" min="1" max="22" value="11">
                                    <div class="btn-input btn-plus">+</div>
                                </div>
                                <div class="do path fz17"><span>до</span>22м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">длина, м - новая2 ш-2</dt>
                            <dd class="has-slider bg-f9 round-10 flex ais jcsb posr vcw-2">
                                <div class="value-calc-wrap">
                                    <input class="value-calc fz20 fw600 center" type="number" name="dlina2" step="2" min="1" max="22" value="11">
                                </div>
                                <div class="do path fz15">до 22 м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">длина, м</dt>
                            <dd class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                <div class="ot path fz17"><span>от</span>1м</div>
                                <div class="value fz20 fw600 center flex aic"><span>11</span>м</div>
                                <div class="do path fz17"><span>до</span>22м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">ширина, м</dt>
                            <dd class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                <div class="ot path fz17"><span>от</span>1м</div>
                                <div class="value fz20 fw600 center flex aic"><span id="widthByPillars">11</span>м</div>
                                <div class="do path fz17"><span>до</span>22м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">высота столбов, м</dt>
                            <dd class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                <div class="ot path fz17"><span>от</span>1м</div>
                                <div class="value fz20 fw600 center flex aic"><span id="columnHeight">11</span>м</div>
                                <div class="do path fz17"><span>до</span>22м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                        <dl>
                            <dt class="name f2 fz16 fw600 ttu lh130 mb-15">высота скатов, м</dt>
                            <dd class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                <div class="ot path fz17"><span>от</span>1м</div>
                                <div class="value fz20 fw600 center flex aic"><span id="roofSlopeHeight">11</span>м</div>
                                <div class="do path fz17"><span>до</span>22м</div>
                                <div class="ui-container absolute w-full">
                                    <div class="slider"></div>
                                </div>
                            </dd>
                        </dl>
                    </div>
                    <div class="calculator-hide-date mb-10 mb-0m">
                        <div class="triger-open flex aic jcsb f2 fz22 fw600 lh110 ttu pointer">уточнение параметров навеса
                            <div class="arrow flex aic jcc bg-red round-7"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                        </div>
                        <div class="calculator-hide-info hide_cl pt-40">
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">Кровля</div>
                            <div class="field-row flex fxww mb-40">
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Материал кровли</div>
                                    <select name="roofCovering" id="ui-id-1">
                                        <option  selected  value="cellularPolycarbonate">Сотовый поликарбонат</option>
                                        <option   value="monolithicPolycarbonate">Монолитный поликарбонат</option>
                                        <option    value="metalTiles">Металлочерепица</option>
                                        <option  value="profileSheet">Профлист</option>
                                        <option   value="softRoof" >Мягкая кровля</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20 hide_992">&nbsp;</div>
                                    <select name="roofingMaterial" id="ui-id-2">
                                        <option value="">4 мм, премиум, Profplast</option>
                                        <option value="">4 мм, премиум, Profplast 2</option>
                                        <option value="">4 мм, премиум, Profplast 3</option>
                                        <option value="">4 мм, премиум, Profplast 4</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Цвет кровли</div>
                                    <select name="colorRoofing" id="ui-id-3">
                                        <option value="">Синий</option>
                                        <option value="">Синий 2</option>
                                        <option value="">Синий 3</option>
                                        <option value="">Синий 4</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Водосточная система</div>
                                    <select nname="drainageSystem" id="ui-id-4">
                                        <option value="">Grandline</option>
                                        <option value="">Grandline 2</option>
                                        <option value="">Grandline 3</option>
                                        <option value="">Grandline 4</option>
                                    </select>
                                </div>
                            </div>
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">окрас</div>
                            <div class="field-row flex fxww mb-40">
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Тип краски</div>
                                    <select name="paint" id="ui-id-5">
                                        <option value="">Грунт-эмаль Dali</option>
                                        <option value="">Грунт-эмаль Dali 2</option>
                                        <option value="">Грунт-эмаль Dali 3</option>
                                        <option value="">Грунт-эмаль Dali 4</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Цвет краски</div>
                                    <select name="colorMetalStructure" id="ui-id-6" >
                                        <option value="#000000">Черный</option>
                                        <option selected value="#0000ff">Синий</option>
                                        <option value="">Синий 3</option>
                                        <option value="">Синий 4</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Тип грунта</div>
                                    <select name="typeGroundColorMetalStructure" id="ui-id-7">
                                        <option value="">ГФ-21</option>
                                        <option value="">ГФ-2</option>
                                        <option value="">ГФ-3</option>
                                        <option value="">ГФ-4</option>
                                    </select>
                                </div>
                            </div>
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">монтаж</div>
                            <div class="field-row flex fxww mb-40">
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Требуется ли монтаж?</div>
                                    <select name="installationRequired" id="ui-id-8">
                                        <option value="yes">Да</option>
                                        <option value="no">Нет</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Крепление опор</div>
                                    <<select name="foundationType" id="ui-id-9">
                                        <option selected value="concreteBase">На бетонное основание</option>
                                        <option value="concreting">Бетонирование столбов</option>
                                        <option value="piles">Сваи</option>
                                        <option value="withoutMounting">Без монтажа столбов</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Расстояние от МКАД</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="100" data-value="10">
                                        <div class="ot path fz17"><span>от</span>1км</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="deliveryDistance" name="deliveryDistance">10</span>км</div>
                                        <div class="do path fz17"><span>до</span>100км</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="calculator-hide-date">
                        <div class="triger-open flex aic jcsb f2 fz22 fw600 lh110 ttu pointer">уточнение параметров каркаса
                            <div class="arrow flex aic jcc bg-red round-7"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                        </div>
                        <div class="calculator-hide-info hide_cl pt-40">
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">использовать базовые конфигурации</div>
                            <div class="label_cl fz18 fw600 mb-20">Материал кровли</div>
                            <div class="roof-row flex fxww gap-20 mb-40 mb-20m">
                                <div class="radio fz18 fw500">
                                    <input class="hide_cl" type="radio" name="roof" id="roof-var-1" onclick="setTypeConstruction('lightweight');">
                                    <label for="roof-var-1">Облегченная</label>
                                </div>
                                <div class="radio fz18 fw500">
                                    <input class="hide_cl" type="radio" name="roof" id="roof-var-2" onclick="setTypeConstruction('standard');">
                                    <label for="roof-var-2">Стандартная</label>
                                </div>
                                <div class="radio fz18 fw500">
                                    <input class="hide_cl" type="radio" name="roof" id="roof-var-3" onclick="setTypeConstruction('reinforced');">
                                    <label for="roof-var-3">Усиленная</label>
                                </div>
                                <div class="radio fz18 fw500">
                                    <input checked class="hide_cl" type="radio" name="roof" id="roof-var-4" onclick="setTypeConstruction('individual');">
                                    <label for="roof-var-4">Индивидуальня</label>
                                </div>
                            </div>
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">столбы</div>
                            <div class="field-row flex fxww mb-40">
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Материал столбов</div>
                                    <select name="postMaterial" id="ui-id-10">
                                        <option value="profilePipe*80*80*3" selected>Профильная труба 80 x 80 x 3 мм</option>
                                        <option value="profilePipe*80*80*5">Профильная труба 80х80х5 мм</option>
                                        <option value="profilePipe*100*100*3">Профильная труба 100 x 100 x 3 мм</option>
                                        <option value="profilePipe*120*120*3">Профильная труба 120 x 120 x 3 мм</option>
                                        <option value="profilePipe*100*100*5">Профильная труба 100х100х5 мм</option>
                                        <option value="profilePipe*120*120*4">Профильная труба 120х120х4 мм</option>
                                        <option value="profilePipe*140*140*4">Профильная труба 140х140х4 мм</option>
                                        <option value="profilePipe*180*180*5">Профильная труба 180х180х5 мм</option>
                                        <option value="profilePipe*200*200*5">Профильная труба 200х200х5 мм</option>
                                        <option value="profilePipe*250*250*6">Профильная труба 250х250х6 мм</option>
                                        <option value="profilePipe*300*300*6">Профильная труба 300х300х6 мм</option>
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Шаг столбов</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span span id="columnDistance">11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>

                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Выпуск балки спереди, мм</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="balkTakeawayFront">11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Выпуск балки сзади, мм</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="balkTakeawayBehind">11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="f2 fz16 fw600 lh140 ttu mb-30">фермы</div>
                            <div class="field-row flex fxww mb-40">
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Шаг ферм</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="stepFerms">11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Материал ферм</div>
                                    <select name="" id="ui-id-11">
                                        <option value='profilePipe*25*25*2'>Профильная труба 25х25х2 мм</option>
                                        <option value='profilePipe*40*25*2'>Профильная труба 40х25х2 мм</option>
                                        <option value='profilePipe*50*25*2.5'>Профильная труба 50х25х2,5 мм</option>
                                        <option value='profilePipe*60*30*3'>Профильная труба 60х30х3 мм</option>
                                        <option value='profilePipe*40*40*2'>Профильная труба 40х40х2 мм</option>
                                        <option value='profilePipe*50*50*3'>Профильная труба 50х50х3 мм</option>
                                        <option value='profilePipe*60*40*3'>Профильная труба 60х40х3 мм</option>  
                                    </select>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Шаг раскосов</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="stepSupports">11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Материал раскосов</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span>11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

<div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Выпуск ферм</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="0" data-max="1000" data-value="300">
                                        <div class="ot path fz17"><span>от</span>0 мм</div>
                                        <div class="value fz20 fw600 center flex aic"><span id="fermsTakeaway">300</span>м</div>
                                        <div class="do path fz17"><span>до</span>1000 мм</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"><div class="ui-slider-range ui-corner-all ui-widget-header ui-slider-range-min" style="width: 47.619%;"></div><span tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default" style="left: 47.619%;"></span></div>
                                        </div>
                                    </div>
                                </div>





                                

                            <div class="f2 fz16 fw600 lh140 ttu mb-30">Виды обрешетки</div>
                            <div class="field-row flex fxww">
                                 <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Виды обрешетки</div>
                                    <select name="" id="ui-id-100" style="display: none;">
                                        <option value='vertical'>Вертикальная</option>
                                        <option value='triangular'>Треугольная</option>    
                                        <option selected value='reinforced'>Усиленная</option>
                                        <option value='solid' disabled>Сплошная</option>                            
                                    </select>
                                </div>
                                <!-- <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Шаг ферм</div>
                                    <div class="has-slider bg-f9 round-10 flex aic jcsb posr" data-min="1" data-max="22" data-value="11">
                                        <div class="ot path fz17"><span>от</span>1м</div>
                                        <div class="value fz20 fw600 center flex aic"><span>11</span>м</div>
                                        <div class="do path fz17"><span>до</span>22м</div>
                                        <div class="ui-container absolute w-full">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div> -->
                                <div class="field-col">
                                    <div class="label_cl fz18 fw600 mb-20">Материал обрешетки</div>
                                    <select name="" id="ui-id-12" style="display: none;">
                                        <option selected value='profilePipe*25*25*2'>Профильная труба 25х25х2 мм</option>
                                        <option value='profilePipe*40*25*2'>Профильная труба 40х25х2 мм</option>
                                        <option value='profilePipe*50*25*2'>Профильная труба 50х25х2 мм</option>
                                        <option value='profilePipe*60*30*2'>Профильная труба 60х30х2 мм</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="hide_cl show_992 mt-20 pt-2">
                    <div class="price-row-m flex aic jcsb mb-20">
                        <div class="price f2 fz20m fw600 lh ttu">256 000 р.</div>
                        <a href="#smeta" class="fz13 fw500 red scroll-link">Подробная смета</a>
                    </div>
                    <a href="" class="btn btn-60 bg-red round-5 flex aic jcc fz15 fw600 fff mb-10">Сделать заказ</a>
                    <a data-fancybox="" data-src="#popup-form-save" href="javascript:;" class="btn btn-60 bg-pink round-5 flex aic jcc fz15 fw600 red">Сохранить расчет</a>
                </div>
            </div>
            <div class="calculator-right fxs">
                <div class="calculator-right-img-block">
                    <div class="path-top flex aic jcsb mb-25 hide_992">
                        <div class="path-top-info">
                            <div class="price f2 fz35 fw600 lh ttu">256 000 р.</div>
                            <a href="#smeta" class="fz13 fw500 red scroll-link hide_cl show_992">Подробная смета</a>
                        </div>

                        <div class="button-row flex gap-20">
                            <a href="" class="btn btn-63 bg-red round-5 flex aic jcc fz17 fw600 fff">Сделать заказ</a>
                            <a data-fancybox="" data-src="#popup-form-save" href="javascript:;" class="btn btn-63 bg-pink round-5 flex aic jcc fz17 fw600 red">Сохранить расчет</a>
                        </div>
                    </div>
                    <div class="images-block posr round-20 flex aic jcc bg-f5 mb-20">
                        <img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/upload/thumb.png" alt="">
                        <div class="images-button absolute flex gap-15 z-2">
                            <a href="" class="save_btn"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/download.svg'></i></a>
                            <a data-fancybox="images-big" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/upload/thumb.png"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/zoom.svg'></i></a>
                        </div>
                    </div>
                    <div class="path-bottom flex aic jcsb fz18 fz11m fw500">
                        <a href="" class="link-360 flex aic gap-15">
                            <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/360.svg'></i> Зажмите click для вращения, крутите scroll для вращения
                        </a>
                        <a href="#smeta" class="red lh110 hide_992  red scroll-link">Подробная смета</a>
                    </div>
                </div>
            </div>
        </section>
        <section class="total-data fz18 fz14m fw600">
            <div class="total-data-row flex fxww grid-3">
                <div class="total-data-col">
                    <div class="total-data-item flex jcsb">
                        Площадь навеса
                        <div class="value def tar"  id="area">34м²</div>
                    </div>
                    <div class="total-data-item flex jcsb">
                        Стоимость м²
                        <div class="value def tar" id="totalMaterialsCost1m2">7 200р.</div>
                    </div>
                    <div class="total-data-item flex jcsb">
                        Стоимость материалов
                        <div class="value def tar" id="totalCostMaterials">67 000 р.</div>
                    </div>
                </div>
                <div class="total-data-col">
                    <div class="total-data-item flex jcsb">
                        Стоимость производства
                        <div class="value def tar" id="totalCostProduction">56 000 р.</div>
                    </div>
                    <div class="total-data-item flex jcsb">
                        Расходные материалы
                        <div class="value def tar" id="totalCostSupplies">13 000 р.</div>
                    </div>
                    <div class="total-data-item flex jcsb">
                        Стоимость монтажа
                        <div class="value def tar" id="totalCostInstallation">11 000 р.</div>
                    </div>
                </div>
                <div class="total-data-col">
                    <div class="total-data-item flex jcsb">
                        Срок производства
                        <div class="value def tar" id="productionTime">8 дней</div>
                    </div>
                </div>
            </div>
        </section>
    </div>
    <div class="oh">
        <section class="specification bg-f9">
            <div class="wrap-cont">
                <h2 class="f2 fz30 fz20m fw600 ttu lh120 mb-10 mb-15m">спецификация навеса</h2>
                <div class="mb-30">
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">01.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">общие параметры</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl" id="generalParams">
                            
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">02.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">столбы</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl" id="columnParams">
                           
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">03.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Фермы</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl" id="fermParams">
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">04.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">лаги</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl" id="lagParams">
                            
                        </dd>
                    </dl>
                </div>
                <h2 class="f2 fz30 fw600 ttu lh120 mb-10" id="smeta">смета навеса</h2>
                <div class="mb-30">
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">01.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Материалы</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl">
                           <ul id="materialsParams">
                              
                            </ul>
                            <div class="total-list flex aic jcsb pt-10 pb-30">
                                <div class="f2 ttu">Материалы итого:</div>
                                <div class="f2" id="materialsParamsTotalCost"></div>
                            </div>
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">02.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Расходные Материалы</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl">
                            <ul id="suppliesParams">
                               
                            </ul>
                            <div class="total-list flex aic jcsb pt-10 pb-30">
                                <div class="f2 ttu">расходные Материалы итого:</div>
                                <div class="f2" id="suppliesParamsTotalCost"></div>
                            </div>
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">03.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Производство</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl">
                            <ul id="productionParams">
                             
                            </ul>
                            <div class="total-list flex aic jcsb pt-10 pb-30">
                                <div class="f2 ttu">производство итого:</div>
                                <div class="f2" id="productionParamsTotalCost"></div>
                            </div>
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">04.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Монтажные работы</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl">
                            <ul id="installationWorkParams">
                                
                            </ul>
                            <div class="total-list flex aic jcsb pt-10 pb-30">
                                <div class="f2 ttu">Монтажные работы итого:</div>
                                <div class="f2" id="installationWorkParamsTotalCost"></div>
                            </div>
                        </dd>
                    </dl>
                    <dl>
                        <dt class="flex aic f2 pointer">
                            <div class="num fz16 fw600 lh140 red fxs">05.</div>
                            <div class="name fz18 fz13m fw600 lh120 ttu fxg">Доставка</div>
                            <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-black.svg'></i></div>
                        </dt>
                        <dd class="fz18 fz13m fw600 lh120 hide_cl">
                            <ul id="deliveryParams">
                                
                            </ul>
                            <div class="total-list noborder flex aic jcsb pt-10 pb-30">
                                <div class="f2 ttu">доставка итого:</div>
                                <div class="f2" id="deliveryParamsTotalCost"></div>
                            </div>
                        </dd>
                    </dl>
                </div>
                <ul class="total-price bg-fff round-10 bg-fff f2 fz18 fz13m fw600 ttu">
                    <li class="flex aic jcsb">
                        <div class="name fxg">Стоимость навеса:</div>
                        <div class="price" name="totalCost"></div>
                    </li>
                    <li class="flex aic jcsb red">
                        <div class="name fxg">Общая скидка:</div>
                        <div class="price" id="totalDiscount"></div>
                    </li>
                    <li class="flex aic jcsb">
                        <div class="name fxg">Итого стоимость навеса (под ключ):</div>
                        <div class="price" id="finalTotalCost"></div>
                    </li>
                </ul>
            </div>
        </section>
        <section class="feedback fixed-img-stop bg-gray3 fff posr">
            <div class="feedback-bg absolute">
                <div class="hide_992"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/bg-feedback.png" alt=""></div>
                <div class="hide_cl show_992"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/bg-feedback-mobile.png" alt=""></div>
            </div>
            <div class="wrap-cont posr z-3">
                <div class="feedback-name f2 fz40 fz22m fw6000 lh ttu mb-50 mb-20m" style="max-width: 700px">у вас есть техническое задание или проект?</div>
                <div class="feedback-txt fz18 fw600 lh140 mb-80">
                    <p>Загрузите файлы в форму и выберите удобный способ связи.</p>
                    <p>Мы составим коммерческое предложение на изготовление
                        <br>навеса по вашим характеристикам в течение 15 минут.</p>
                </div>
                <form class="feedback-form bg-gray4 round-15" enctype="multipart/form-data">
                    <div class="feedback-row flex fxww grid-4">
                        <div class="feedback-field">
                            <div class="label_cl block fz18 fff op-40 mb-15">Выберите удобный способ связи</div>
                            <select class="select hide_cl" name="" id="">
                                <option value="">WhatsApp</option>
                                <option value="">Telegram</option>
                            </select>
                        </div>
                        <div class="feedback-field">
                            <div class="label_cl block fz18 fff op-40 mb-15">Введите данные</div>
                            <input class="input" type="tel" placeholder="+7 (987) 654-32-10">
                        </div>
                        <div class="feedback-field">
                            <div class="label_cl block fz18 fff op-40 mb-15">Загрузите файлы</div>
                            <div id="dropArea" class="drop-area fz18 fw600 round-10 flex aic jcc posr">
                                <p>Перенесите файлы в это окно
                                    <label for="fileInput" class="clsfileInput file-label_cl w-full h-full pointer"></label>
                                </p>
                                <input type="file" id="fileInput" multiple hidden>
                            </div>
                            <ol id="fileList" class="fz13"></ol>
                        </div>
                        <div class="feedback-field">
                            <button class="btn bg-red fz18 fw600 lh w-full round-10 mb-15 mt-40">Рассчитать стоимость</button>
                            <div class="accept">
                                <input type="checkbox" id="accept" class="hide_cl">
                                <label for="accept" class="flex aic gap-20 pointer fz18 lh110">
                                    <span class="icon flex aic jcc">
                                        <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check.svg'></i>
                                    </span>
                                    <span class="accept-txt">Я принимаю <a href="">условия обработки</a></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    </div>
    <section class="advantages bg-f9 oh">
        <div class="wrap-cont">
            <div class="name f2 fz40 fz22m fw600 ttu mb-60 mb-30m">наши преимущества</div>
            <div class="advantages-row flex fxww grid-4 mb-15m">
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/1.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">моментальный расчет</div>
                        <div class="txt fz18 lh140">Точный расчет стоимости выполняется за считанные минуты, без лишнего ожидания.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/2.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">качественный окрас
                        </div>
                        <div class="txt fz18 lh140">Современные технологии окрашивания обеспечивают долговечность покрытия и эстетичный вид.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/3.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">высокая
                            <br> прочность
                        </div>
                        <div class="txt fz18 lh140">Навесы спроектированы с учетом максимальной надежности и устойчивости к любым нагрузкам.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/4.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">усиленные
                            <br> материалы
                        </div>
                        <div class="txt fz18 lh140">Для изготовления используются прочные и долговечные материалы, выдерживающие любые погодные условия.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/5.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">прозрачная
                            <br> смета
                        </div>
                        <div class="txt fz18 lh140">Подробная смета с фиксирован-ной стоимостью, без скрытых платежей и неожиданностей.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/6.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">Моментальная
                            <br> визуализация</div>
                        <div class="txt fz18 lh140">Вы сразу увидите, как будет выглядеть ваш навес благодаря быстрой 3D-визуализации.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/7.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">быстрый
                            <br> монтаж
                        </div>
                        <div class="txt fz18 lh140">Установка навеса занимает минимальное время благодаря профессиональной команде.</div>
                    </div>
                </div>
                <div class="advantages-item bg-fff round-15 p-15">
                    <div class="thumb oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/advantages/8.jpg" alt=""></div>
                    <div class="info">
                        <div class="title f2 fz18 fw600 lh120 ttu mb-15">индивидуальный
                            <br> подход
                        </div>
                        <div class="txt fz18 lh140">Мы подберем оптимальное решение под ваши задачи и пожелания.</div>
                    </div>
                </div>
            </div>
            <div class="swap hide_cl flex_992 aic gap-15 fz11 fw500 lh140">
                <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/swap.svg'></i> Продолжайте листать, чтобы
                <br> узнать все преимущества
            </div>
        </div>
    </section>
    <section class="project oh">
        <div class="wrap-cont">
            <div class="name f2 fz40 fw600 ttu mb-70 mb-30m">наши реализованные
                <br> проекты</div>
            <div class="project-row flex fxww grid-3 block_992 img-full mb-40 mb-15m">
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/2.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/3.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/4.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/5.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/6.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/3.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/4.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/5.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/6.jpg" alt=""></a>
                </div>
                <div class="project-item">
                    <a data-fancybox="images" href="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/1.jpg" class="block oh round-15"><img src="<?=SITE_TEMPLATE_PATH?>/images/images-calc/project/6.jpg" alt=""></a>
                </div>
            </div>

            <div class="project-button flex grid-3 hide_992">
                <button class="btn btn-73 bg-red round-5 flex aic jcc gap-15 fz17 fw600 fff">Показать еще <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/re.svg'></i></button>
            </div>
            <div class="swap hide_cl flex_992 aic gap-15 fz11 fw500 lh140">
                <i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/swap.svg'></i> Нажмите на фото, чтобы открыть
                <br> его в полом размере
            </div>
        </div>
    </section>
    <section class="step bg-f9 oh">
        <div class="wrap-cont">
            <div class="name f2 fz40 fw600 ttu mb-70 mb-30m">средний срок
                <br> изготовления навеса
                <br> от <span class="red">1 недели</span></div>
            <div class="step-row flex fxww grid-3 mb-100 mb-50m">
                <div class="step-item bg-fff round-15 p-30">
                    <div class="top flex aic jcsb mb-45 mb-30m">
                        <div class="f2 fz12 fw600 lh def op-10 ttu">01</div>
                        <div class="icon flex jcfe"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check-red.svg'></i></div>
                    </div>
                    <div class="name f2 fz22 fz15m fw600 lh110 ttu mb-20 mb-10m">согласование</div>
                    <div class="txt fz18 lh140">Обсуждаем ваши пожелания, подбираем оптимальный вариант навеса и утверждаем проект.</div>
                </div>
                <div class="step-item bg-fff round-15 p-30">
                    <div class="top flex aic jcsb mb-45 mb-30m">
                        <div class="f2 fz12 fw600 lh def op-10 ttu">02</div>
                        <div class="icon flex jcfe"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check-red.svg'></i></div>
                    </div>
                    <div class="name f2 fz22 fz15m fw600 lh110 ttu mb-20 mb-10m">сварка</div>
                    <div class="txt fz18 lh140">Изготавливаем конструкцию с использова-нием профессионального оборудования для максимальной прочности.</div>
                </div>
                <div class="step-item bg-fff round-15 p-30">
                    <div class="top flex aic jcsb mb-45 mb-30m">
                        <div class="f2 fz12 fw600 lh def op-10 ttu">03</div>
                        <div class="icon flex jcfe"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check-red.svg'></i></div>
                    </div>
                    <div class="name f2 fz22 fz15m fw600 lh110 ttu mb-20 mb-10m">окрас</div>
                    <div class="txt fz18 lh140">Покрываем навес качественной краской, устойчивой к погодным условиям и выцветанию.</div>
                </div>
                <div class="step-item bg-fff round-15 p-30">
                    <div class="top flex aic jcsb mb-45 mb-30m">
                        <div class="f2 fz12 fw600 lh def op-10 ttu">04</div>
                        <div class="icon flex jcfe"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check-red.svg'></i></div>
                    </div>
                    <div class="name f2 fz22 fz15m fw600 lh110 ttu mb-20 mb-10m">Комплектирование</div>
                    <div class="txt fz18 lh140">Собираем все необходимые элементы конструкции для доставки и монтажа.</div>
                </div>
                <div class="step-item bg-fff round-15 p-30">
                    <div class="top flex aic jcsb mb-45 mb-30m">
                        <div class="f2 fz12 fw600 lh def op-10 ttu">05</div>
                        <div class="icon flex jcfe"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/check-red.svg'></i></div>
                    </div>
                    <div class="name f2 fz22 fz15m fw600 lh110 ttu mb-20 mb-10m">монтаж</div>
                    <div class="txt fz18 lh140">Устанавливаем навес на вашем участке быстро и аккуратно, соблюдая все стандарты.</div>
                </div>
            </div>
            <dl class="usually bg-gray4 round-15 p-60 fff">
                <dt class="flex aic jcsb pointer f2 fz25 fw6000 ttu lh110 ">на чем обычно экономят?<div class="arrow bg-red flex aic jcc round-10 fxs"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                </dt>
                <dd class="fz18 fw600 f9 hide_cl">
                    <p>1. Шаг столбов от 3 метров – экономия на металле.</p>
                    <p>2. Толщина металла столбов менее 3 мм – экономия на металле.</p>
                    <p>3. Рама ферм из менее прочного профиля, толщина металла менее 2 мм – экономия на металле.</p>
                    <p>4. Ребра ферм из менее прочного профиля, толщина металла менее 1,5 мм – экономия на металле.</p>
                    <p>5. Шаг обребровки ферм более 50 см для профиля менее 60х40х3 – экономия на металле.</p>
                    <p>6. Шаг ферм более 1,5 м – экономия на металле.</p>
                    <p>7. Шаг лагов более 50 см – экономия на металле.</p>
                    <p>8. Поликарбонат низкой плотности – экономия на поликарбонате.</p>
                    <p>9. Использование кровельных саморезов вместо термошайб – экономия на расходниках.</p>
                    <p>10. Неправильная обработка металла при покраске (не обрабатывается обезжиривателем или скотч-брайтом) – экономия на расходниках.</p>
                    <p>11. Глубина столбов при бетонировании менее 1,3 метра – экономия на металле, экономия на расходниках.</p>
                </dd>
            </dl>
        </div>
    </section>
    <section class="faq bg-gray4 oh fff">
        <div class="wrap-cont">
            <div class="name f2 fz40 fw600 ttu mb-60 mb-30m">ответы
                <br> на частые вопросы</div>
            <div class="faq-row flex fxww grid-2 fff">
                <div class="faq-item">
                    <div class="title f2 fz20 fw600 ttu pointer flex aic jcsb gap-10">
                        Сколько времени занимает
                        <br> изготовление и монтаж навеса?
                        <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                    </div>
                    <div class="txt hide_cl fz18 fw600 op-65">Изготовление конструкции занимает от 5 до 10 дней в зависимости от сложности, а монтаж обычно выполняется за 1-2 дня.</div>
                </div>
                <div class="faq-item">
                    <div class="title f2 fz20 fw600 ttu pointer flex aic jcsb gap-10">
                        Можно ли заказать навес
                        <br> по индивидуальным размерам?
                        <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                    </div>
                    <div class="txt hide_cl fz18 fw600 op-65">Да, мы изготавливаем навесы по вашим индивидуальным размерам и учитываем все пожелания к дизайну,</div>
                </div>
                <div class="faq-item">
                    <div class="title f2 fz20 fw600 ttu pointer flex aic jcsb gap-10">
                        Предоставляете ли вы гарантию?
                        <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                    </div>
                    <div class="txt hide_cl fz18 fw600 op-65">Да. мы предоставляем гарантию на все наши навесы, включая материалы и монтажные работы.</div>
                </div>
                <div class="faq-item">
                    <div class="title f2 fz20 fw600 ttu pointer flex aic jcsb gap-10">
                        Какие материалы используются для навесов?
                        <div class="arrow tr"><i data-svg='<?=SITE_TEMPLATE_PATH?>/images/images-calc/arrow-down-fff.svg'></i></div>
                    </div>
                    <div class="txt hide_cl fz18 fw600 op-65">Мы используем высококачественный металл и усиленные покрытия, которые обеспечивают долговечность и прочность конструкции.</div>
                </div>
            </div>
        </div>
    </section>
    <div class="popup-form" id="popup-form-save" style="display: block !important;">
        <div class="form-popup-wrap">
            <form action="" class="form-popup">
                <div class="form-title">Отправить на WhatsApp:</div>
                <div class="form-row">
                    <div class="form-row-txt">Ваш телефон:</div>
                    <input type="text" name="phone" class="phone" placeholder="+7 905 123-45-56">
                </div>
                <div class="form-row">
                    <div class="form-row-txt">Нужна консультация?</div>
                    <select name="choice" class="norm">
                        <option value="Да" selected>Да</option>
                        <option value="Нет">Нет</option>
                    </select>
                </div>
                <div class="form-row form-row-btn">
                    <button type="submit" class="btn bg-red round-5 flex aic jcc fz17 fw600 fff">Отправить</button>
                </div>
            </form>
        </div>
    </div>
</form>
<?
Asset::getInstance()->addJs(SITE_TEMPLATE_PATH."/js/calc/jquery-ui-1.14.1/jquery-ui.min.js", true);
Asset::getInstance()->addJs(SITE_TEMPLATE_PATH."/js/calc/jquery.ui.touch-punch.min.js", true);
Asset::getInstance()->addJs(SITE_TEMPLATE_PATH."/js/calc/init.js", true);
require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php");?>