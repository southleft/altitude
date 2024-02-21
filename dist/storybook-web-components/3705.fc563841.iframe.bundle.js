/*! For license information please see 3705.fc563841.iframe.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunkal_web_components=self.webpackChunkal_web_components||[]).push([[3705],{"../../node_modules/@lit/reactive-element/decorators/base.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{i:()=>e});const e=(e,t,c)=>(c.configurable=!0,c.enumerable=!0,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,c),c)},"../../node_modules/@lit/reactive-element/decorators/query.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{P:()=>e});var _base_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/@lit/reactive-element/decorators/base.js");function e(e,r){return(n,s,i)=>{const o=t=>t.renderRoot?.querySelector(e)??null;if(r){const{get:e,set:r}="object"==typeof s?n:i??(()=>{const t=Symbol();return{get(){return this[t]},set(e){this[t]=e}}})();return(0,_base_js__WEBPACK_IMPORTED_MODULE_0__.i)(n,s,{get(){let t=e.call(this);return void 0===t&&(t=o(this),(null!==t||this.hasUpdated)&&r.call(this,t)),t}})}return(0,_base_js__WEBPACK_IMPORTED_MODULE_0__.i)(n,s,{get(){return o(this)}})}}},"../../node_modules/lit-html/directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{OA:()=>t,WL:()=>i,u$:()=>e});var t={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},e=t=>function(){for(var _len=arguments.length,e=new Array(_len),_key=0;_key<_len;_key++)e[_key]=arguments[_key];return{_$litDirective$:t,values:e}};class i{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}},"../../node_modules/lit/decorators.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{EM:()=>t,MZ:()=>n,P:()=>query.P,KN:()=>query_assigned_elements_o,gZ:()=>query_assigned_nodes_n,nJ:()=>query_async_r,wk:()=>state_r});const t=t=>(e,o)=>{void 0!==o?o.addInitializer((()=>{customElements.define(t,e)})):customElements.define(t,e)};var reactive_element=__webpack_require__("../../node_modules/@lit/reactive-element/reactive-element.js");const o={attribute:!0,type:String,converter:reactive_element.W3,reflect:!1,hasChanged:reactive_element.Ec},r=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),s.set(r.name,t),"accessor"===n){const{name:o}=r;return{set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t)},init(e){return void 0!==e&&this.P(o,void 0,t),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t)}}throw Error("Unsupported decorator location: "+n)};function n(t){return(e,o)=>"object"==typeof o?r(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,r?{...t,wrapped:!0}:t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}function state_r(r){return n({...r,state:!0,attribute:!1})}var query=__webpack_require__("../../node_modules/@lit/reactive-element/decorators/query.js"),base=__webpack_require__("../../node_modules/@lit/reactive-element/decorators/base.js");function query_async_r(r){return(n,e)=>(0,base.i)(n,e,{async get(){return await this.updateComplete,this.renderRoot?.querySelector(r)??null}})}function query_assigned_elements_o(o){return(e,n)=>{const{slot:r,selector:s}=o??{},c="slot"+(r?`[name=${r}]`:":not([name])");return(0,base.i)(e,n,{get(){const t=this.renderRoot?.querySelector(c),e=t?.assignedElements(o)??[];return void 0===s?e:e.filter((t=>t.matches(s)))}})}}function query_assigned_nodes_n(n){return(o,r)=>{const{slot:e}=n??{},s="slot"+(e?`[name=${e}]`:":not([name])");return(0,base.i)(o,r,{get(){const t=this.renderRoot?.querySelector(s);return t?.assignedNodes(n)??[]}})}}},"../../node_modules/lit/directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{OA:()=>lit_html_directive_js__WEBPACK_IMPORTED_MODULE_0__.OA,WL:()=>lit_html_directive_js__WEBPACK_IMPORTED_MODULE_0__.WL,u$:()=>lit_html_directive_js__WEBPACK_IMPORTED_MODULE_0__.u$});var lit_html_directive_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/lit-html/directive.js")},"../../node_modules/lit/directives/class-map.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{H:()=>e});var lit_html=__webpack_require__("../../node_modules/lit-html/lit-html.js"),directive=__webpack_require__("../../node_modules/lit-html/directive.js"),e=(0,directive.u$)(class extends directive.WL{constructor(t){var _t$strings;if(super(t),t.type!==directive.OA.ATTRIBUTE||"class"!==t.name||(null===(_t$strings=t.strings)||void 0===_t$strings?void 0:_t$strings.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter((s=>t[s])).join(" ")+" "}update(s,_ref){var[i]=_ref;if(void 0===this.st){for(var _t in this.st=new Set,void 0!==s.strings&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter((t=>""!==t)))),i){var _this$nt;i[_t]&&(null===(_this$nt=this.nt)||void 0===_this$nt||!_this$nt.has(_t))&&this.st.add(_t)}return this.render(i)}var r=s.element.classList;for(var _t2 of this.st)_t2 in i||(r.remove(_t2),this.st.delete(_t2));for(var _t3 in i){var _this$nt2,_s=!!i[_t3];_s===this.st.has(_t3)||(null===(_this$nt2=this.nt)||void 0===_this$nt2?void 0:_this$nt2.has(_t3))||(_s?(r.add(_t3),this.st.add(_t3)):(r.remove(_t3),this.st.delete(_t3)))}return lit_html.c0}})},"../../node_modules/lit/directives/if-defined.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{J:()=>o});var lit_html=__webpack_require__("../../node_modules/lit-html/lit-html.js"),o=o=>null!=o?o:lit_html.s6},"../../node_modules/date-fns/_lib/defaultOptions.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{q:()=>getDefaultOptions});let defaultOptions={};function getDefaultOptions(){return defaultOptions}},"../../node_modules/date-fns/constants.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Cg:()=>millisecondsInMinute,my:()=>millisecondsInWeek,w4:()=>millisecondsInDay});Math.pow(10,8);const millisecondsInWeek=6048e5,millisecondsInDay=864e5,millisecondsInMinute=6e4},"../../node_modules/date-fns/constructFrom.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{function constructFrom(date,value){return date instanceof Date?new date.constructor(value):new Date(value)}__webpack_require__.d(__webpack_exports__,{w:()=>constructFrom})},"../../node_modules/date-fns/format.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{GP:()=>format});const formatDistanceLocale={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}};function buildFormatLongFn(args){return(options={})=>{const width=options.width?String(options.width):args.defaultWidth;return args.formats[width]||args.formats[args.defaultWidth]}}const formatLong={date:buildFormatLongFn({formats:{full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},defaultWidth:"full"}),time:buildFormatLongFn({formats:{full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},defaultWidth:"full"}),dateTime:buildFormatLongFn({formats:{full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},defaultWidth:"full"})},formatRelativeLocale={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"};function buildLocalizeFn(args){return(value,options)=>{let valuesArray;if("formatting"===(options?.context?String(options.context):"standalone")&&args.formattingValues){const defaultWidth=args.defaultFormattingWidth||args.defaultWidth,width=options?.width?String(options.width):defaultWidth;valuesArray=args.formattingValues[width]||args.formattingValues[defaultWidth]}else{const defaultWidth=args.defaultWidth,width=options?.width?String(options.width):args.defaultWidth;valuesArray=args.values[width]||args.values[defaultWidth]}return valuesArray[args.argumentCallback?args.argumentCallback(value):value]}}function buildMatchFn(args){return(string,options={})=>{const width=options.width,matchPattern=width&&args.matchPatterns[width]||args.matchPatterns[args.defaultMatchWidth],matchResult=string.match(matchPattern);if(!matchResult)return null;const matchedString=matchResult[0],parsePatterns=width&&args.parsePatterns[width]||args.parsePatterns[args.defaultParseWidth],key=Array.isArray(parsePatterns)?function findIndex(array,predicate){for(let key=0;key<array.length;key++)if(predicate(array[key]))return key;return}(parsePatterns,(pattern=>pattern.test(matchedString))):function findKey(object,predicate){for(const key in object)if(Object.prototype.hasOwnProperty.call(object,key)&&predicate(object[key]))return key;return}(parsePatterns,(pattern=>pattern.test(matchedString)));let value;value=args.valueCallback?args.valueCallback(key):key,value=options.valueCallback?options.valueCallback(value):value;return{value,rest:string.slice(matchedString.length)}}}const enUS={code:"en-US",formatDistance:(token,count,options)=>{let result;const tokenValue=formatDistanceLocale[token];return result="string"==typeof tokenValue?tokenValue:1===count?tokenValue.one:tokenValue.other.replace("{{count}}",count.toString()),options?.addSuffix?options.comparison&&options.comparison>0?"in "+result:result+" ago":result},formatLong,formatRelative:(token,_date,_baseDate,_options)=>formatRelativeLocale[token],localize:{ordinalNumber:(dirtyNumber,_options)=>{const number=Number(dirtyNumber),rem100=number%100;if(rem100>20||rem100<10)switch(rem100%10){case 1:return number+"st";case 2:return number+"nd";case 3:return number+"rd"}return number+"th"},era:buildLocalizeFn({values:{narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},defaultWidth:"wide"}),quarter:buildLocalizeFn({values:{narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},defaultWidth:"wide",argumentCallback:quarter=>quarter-1}),month:buildLocalizeFn({values:{narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},defaultWidth:"wide"}),day:buildLocalizeFn({values:{narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},defaultWidth:"wide"}),dayPeriod:buildLocalizeFn({values:{narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},defaultWidth:"wide",formattingValues:{narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},defaultFormattingWidth:"wide"})},match:{ordinalNumber:function buildMatchPatternFn(args){return(string,options={})=>{const matchResult=string.match(args.matchPattern);if(!matchResult)return null;const matchedString=matchResult[0],parseResult=string.match(args.parsePattern);if(!parseResult)return null;let value=args.valueCallback?args.valueCallback(parseResult[0]):parseResult[0];value=options.valueCallback?options.valueCallback(value):value;return{value,rest:string.slice(matchedString.length)}}}({matchPattern:/^(\d+)(th|st|nd|rd)?/i,parsePattern:/\d+/i,valueCallback:value=>parseInt(value,10)}),era:buildMatchFn({matchPatterns:{narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},defaultMatchWidth:"wide",parsePatterns:{any:[/^b/i,/^(a|c)/i]},defaultParseWidth:"any"}),quarter:buildMatchFn({matchPatterns:{narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},defaultMatchWidth:"wide",parsePatterns:{any:[/1/i,/2/i,/3/i,/4/i]},defaultParseWidth:"any",valueCallback:index=>index+1}),month:buildMatchFn({matchPatterns:{narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},defaultMatchWidth:"wide",parsePatterns:{narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},defaultParseWidth:"any"}),day:buildMatchFn({matchPatterns:{narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},defaultMatchWidth:"wide",parsePatterns:{narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},defaultParseWidth:"any"}),dayPeriod:buildMatchFn({matchPatterns:{narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},defaultMatchWidth:"any",parsePatterns:{any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},defaultParseWidth:"any"})},options:{weekStartsOn:0,firstWeekContainsDate:1}};var _lib_defaultOptions=__webpack_require__("../../node_modules/date-fns/_lib/defaultOptions.mjs"),constants=__webpack_require__("../../node_modules/date-fns/constants.mjs"),startOfDay=__webpack_require__("../../node_modules/date-fns/startOfDay.mjs"),toDate=__webpack_require__("../../node_modules/date-fns/toDate.mjs");function getTimezoneOffsetInMilliseconds(date){const _date=(0,toDate.a)(date),utcDate=new Date(Date.UTC(_date.getFullYear(),_date.getMonth(),_date.getDate(),_date.getHours(),_date.getMinutes(),_date.getSeconds(),_date.getMilliseconds()));return utcDate.setUTCFullYear(_date.getFullYear()),+date-+utcDate}function differenceInCalendarDays(dateLeft,dateRight){const startOfDayLeft=(0,startOfDay.o)(dateLeft),startOfDayRight=(0,startOfDay.o)(dateRight),timestampLeft=+startOfDayLeft-getTimezoneOffsetInMilliseconds(startOfDayLeft),timestampRight=+startOfDayRight-getTimezoneOffsetInMilliseconds(startOfDayRight);return Math.round((timestampLeft-timestampRight)/constants.w4)}var startOfYear=__webpack_require__("../../node_modules/date-fns/startOfYear.mjs");function getDayOfYear(date){const _date=(0,toDate.a)(date);return differenceInCalendarDays(_date,(0,startOfYear.D)(_date))+1}function startOfWeek(date,options){const defaultOptions=(0,_lib_defaultOptions.q)(),weekStartsOn=options?.weekStartsOn??options?.locale?.options?.weekStartsOn??defaultOptions.weekStartsOn??defaultOptions.locale?.options?.weekStartsOn??0,_date=(0,toDate.a)(date),day=_date.getDay(),diff=(day<weekStartsOn?7:0)+day-weekStartsOn;return _date.setDate(_date.getDate()-diff),_date.setHours(0,0,0,0),_date}function startOfISOWeek(date){return startOfWeek(date,{weekStartsOn:1})}var constructFrom=__webpack_require__("../../node_modules/date-fns/constructFrom.mjs");function getISOWeekYear(date){const _date=(0,toDate.a)(date),year=_date.getFullYear(),fourthOfJanuaryOfNextYear=(0,constructFrom.w)(date,0);fourthOfJanuaryOfNextYear.setFullYear(year+1,0,4),fourthOfJanuaryOfNextYear.setHours(0,0,0,0);const startOfNextYear=startOfISOWeek(fourthOfJanuaryOfNextYear),fourthOfJanuaryOfThisYear=(0,constructFrom.w)(date,0);fourthOfJanuaryOfThisYear.setFullYear(year,0,4),fourthOfJanuaryOfThisYear.setHours(0,0,0,0);const startOfThisYear=startOfISOWeek(fourthOfJanuaryOfThisYear);return _date.getTime()>=startOfNextYear.getTime()?year+1:_date.getTime()>=startOfThisYear.getTime()?year:year-1}function startOfISOWeekYear(date){const year=getISOWeekYear(date),fourthOfJanuary=(0,constructFrom.w)(date,0);return fourthOfJanuary.setFullYear(year,0,4),fourthOfJanuary.setHours(0,0,0,0),startOfISOWeek(fourthOfJanuary)}function getISOWeek(date){const _date=(0,toDate.a)(date),diff=+startOfISOWeek(_date)-+startOfISOWeekYear(_date);return Math.round(diff/constants.my)+1}function getWeekYear(date,options){const _date=(0,toDate.a)(date),year=_date.getFullYear(),defaultOptions=(0,_lib_defaultOptions.q)(),firstWeekContainsDate=options?.firstWeekContainsDate??options?.locale?.options?.firstWeekContainsDate??defaultOptions.firstWeekContainsDate??defaultOptions.locale?.options?.firstWeekContainsDate??1,firstWeekOfNextYear=(0,constructFrom.w)(date,0);firstWeekOfNextYear.setFullYear(year+1,0,firstWeekContainsDate),firstWeekOfNextYear.setHours(0,0,0,0);const startOfNextYear=startOfWeek(firstWeekOfNextYear,options),firstWeekOfThisYear=(0,constructFrom.w)(date,0);firstWeekOfThisYear.setFullYear(year,0,firstWeekContainsDate),firstWeekOfThisYear.setHours(0,0,0,0);const startOfThisYear=startOfWeek(firstWeekOfThisYear,options);return _date.getTime()>=startOfNextYear.getTime()?year+1:_date.getTime()>=startOfThisYear.getTime()?year:year-1}function startOfWeekYear(date,options){const defaultOptions=(0,_lib_defaultOptions.q)(),firstWeekContainsDate=options?.firstWeekContainsDate??options?.locale?.options?.firstWeekContainsDate??defaultOptions.firstWeekContainsDate??defaultOptions.locale?.options?.firstWeekContainsDate??1,year=getWeekYear(date,options),firstWeek=(0,constructFrom.w)(date,0);firstWeek.setFullYear(year,0,firstWeekContainsDate),firstWeek.setHours(0,0,0,0);return startOfWeek(firstWeek,options)}function getWeek(date,options){const _date=(0,toDate.a)(date),diff=+startOfWeek(_date,options)-+startOfWeekYear(_date,options);return Math.round(diff/constants.my)+1}function addLeadingZeros(number,targetLength){return(number<0?"-":"")+Math.abs(number).toString().padStart(targetLength,"0")}const lightFormatters={y(date,token){const signedYear=date.getFullYear(),year=signedYear>0?signedYear:1-signedYear;return addLeadingZeros("yy"===token?year%100:year,token.length)},M(date,token){const month=date.getMonth();return"M"===token?String(month+1):addLeadingZeros(month+1,2)},d:(date,token)=>addLeadingZeros(date.getDate(),token.length),a(date,token){const dayPeriodEnumValue=date.getHours()/12>=1?"pm":"am";switch(token){case"a":case"aa":return dayPeriodEnumValue.toUpperCase();case"aaa":return dayPeriodEnumValue;case"aaaaa":return dayPeriodEnumValue[0];default:return"am"===dayPeriodEnumValue?"a.m.":"p.m."}},h:(date,token)=>addLeadingZeros(date.getHours()%12||12,token.length),H:(date,token)=>addLeadingZeros(date.getHours(),token.length),m:(date,token)=>addLeadingZeros(date.getMinutes(),token.length),s:(date,token)=>addLeadingZeros(date.getSeconds(),token.length),S(date,token){const numberOfDigits=token.length,milliseconds=date.getMilliseconds();return addLeadingZeros(Math.trunc(milliseconds*Math.pow(10,numberOfDigits-3)),token.length)}},dayPeriodEnum_midnight="midnight",dayPeriodEnum_noon="noon",dayPeriodEnum_morning="morning",dayPeriodEnum_afternoon="afternoon",dayPeriodEnum_evening="evening",dayPeriodEnum_night="night",formatters={G:function(date,token,localize){const era=date.getFullYear()>0?1:0;switch(token){case"G":case"GG":case"GGG":return localize.era(era,{width:"abbreviated"});case"GGGGG":return localize.era(era,{width:"narrow"});default:return localize.era(era,{width:"wide"})}},y:function(date,token,localize){if("yo"===token){const signedYear=date.getFullYear(),year=signedYear>0?signedYear:1-signedYear;return localize.ordinalNumber(year,{unit:"year"})}return lightFormatters.y(date,token)},Y:function(date,token,localize,options){const signedWeekYear=getWeekYear(date,options),weekYear=signedWeekYear>0?signedWeekYear:1-signedWeekYear;if("YY"===token){return addLeadingZeros(weekYear%100,2)}return"Yo"===token?localize.ordinalNumber(weekYear,{unit:"year"}):addLeadingZeros(weekYear,token.length)},R:function(date,token){return addLeadingZeros(getISOWeekYear(date),token.length)},u:function(date,token){return addLeadingZeros(date.getFullYear(),token.length)},Q:function(date,token,localize){const quarter=Math.ceil((date.getMonth()+1)/3);switch(token){case"Q":return String(quarter);case"QQ":return addLeadingZeros(quarter,2);case"Qo":return localize.ordinalNumber(quarter,{unit:"quarter"});case"QQQ":return localize.quarter(quarter,{width:"abbreviated",context:"formatting"});case"QQQQQ":return localize.quarter(quarter,{width:"narrow",context:"formatting"});default:return localize.quarter(quarter,{width:"wide",context:"formatting"})}},q:function(date,token,localize){const quarter=Math.ceil((date.getMonth()+1)/3);switch(token){case"q":return String(quarter);case"qq":return addLeadingZeros(quarter,2);case"qo":return localize.ordinalNumber(quarter,{unit:"quarter"});case"qqq":return localize.quarter(quarter,{width:"abbreviated",context:"standalone"});case"qqqqq":return localize.quarter(quarter,{width:"narrow",context:"standalone"});default:return localize.quarter(quarter,{width:"wide",context:"standalone"})}},M:function(date,token,localize){const month=date.getMonth();switch(token){case"M":case"MM":return lightFormatters.M(date,token);case"Mo":return localize.ordinalNumber(month+1,{unit:"month"});case"MMM":return localize.month(month,{width:"abbreviated",context:"formatting"});case"MMMMM":return localize.month(month,{width:"narrow",context:"formatting"});default:return localize.month(month,{width:"wide",context:"formatting"})}},L:function(date,token,localize){const month=date.getMonth();switch(token){case"L":return String(month+1);case"LL":return addLeadingZeros(month+1,2);case"Lo":return localize.ordinalNumber(month+1,{unit:"month"});case"LLL":return localize.month(month,{width:"abbreviated",context:"standalone"});case"LLLLL":return localize.month(month,{width:"narrow",context:"standalone"});default:return localize.month(month,{width:"wide",context:"standalone"})}},w:function(date,token,localize,options){const week=getWeek(date,options);return"wo"===token?localize.ordinalNumber(week,{unit:"week"}):addLeadingZeros(week,token.length)},I:function(date,token,localize){const isoWeek=getISOWeek(date);return"Io"===token?localize.ordinalNumber(isoWeek,{unit:"week"}):addLeadingZeros(isoWeek,token.length)},d:function(date,token,localize){return"do"===token?localize.ordinalNumber(date.getDate(),{unit:"date"}):lightFormatters.d(date,token)},D:function(date,token,localize){const dayOfYear=getDayOfYear(date);return"Do"===token?localize.ordinalNumber(dayOfYear,{unit:"dayOfYear"}):addLeadingZeros(dayOfYear,token.length)},E:function(date,token,localize){const dayOfWeek=date.getDay();switch(token){case"E":case"EE":case"EEE":return localize.day(dayOfWeek,{width:"abbreviated",context:"formatting"});case"EEEEE":return localize.day(dayOfWeek,{width:"narrow",context:"formatting"});case"EEEEEE":return localize.day(dayOfWeek,{width:"short",context:"formatting"});default:return localize.day(dayOfWeek,{width:"wide",context:"formatting"})}},e:function(date,token,localize,options){const dayOfWeek=date.getDay(),localDayOfWeek=(dayOfWeek-options.weekStartsOn+8)%7||7;switch(token){case"e":return String(localDayOfWeek);case"ee":return addLeadingZeros(localDayOfWeek,2);case"eo":return localize.ordinalNumber(localDayOfWeek,{unit:"day"});case"eee":return localize.day(dayOfWeek,{width:"abbreviated",context:"formatting"});case"eeeee":return localize.day(dayOfWeek,{width:"narrow",context:"formatting"});case"eeeeee":return localize.day(dayOfWeek,{width:"short",context:"formatting"});default:return localize.day(dayOfWeek,{width:"wide",context:"formatting"})}},c:function(date,token,localize,options){const dayOfWeek=date.getDay(),localDayOfWeek=(dayOfWeek-options.weekStartsOn+8)%7||7;switch(token){case"c":return String(localDayOfWeek);case"cc":return addLeadingZeros(localDayOfWeek,token.length);case"co":return localize.ordinalNumber(localDayOfWeek,{unit:"day"});case"ccc":return localize.day(dayOfWeek,{width:"abbreviated",context:"standalone"});case"ccccc":return localize.day(dayOfWeek,{width:"narrow",context:"standalone"});case"cccccc":return localize.day(dayOfWeek,{width:"short",context:"standalone"});default:return localize.day(dayOfWeek,{width:"wide",context:"standalone"})}},i:function(date,token,localize){const dayOfWeek=date.getDay(),isoDayOfWeek=0===dayOfWeek?7:dayOfWeek;switch(token){case"i":return String(isoDayOfWeek);case"ii":return addLeadingZeros(isoDayOfWeek,token.length);case"io":return localize.ordinalNumber(isoDayOfWeek,{unit:"day"});case"iii":return localize.day(dayOfWeek,{width:"abbreviated",context:"formatting"});case"iiiii":return localize.day(dayOfWeek,{width:"narrow",context:"formatting"});case"iiiiii":return localize.day(dayOfWeek,{width:"short",context:"formatting"});default:return localize.day(dayOfWeek,{width:"wide",context:"formatting"})}},a:function(date,token,localize){const dayPeriodEnumValue=date.getHours()/12>=1?"pm":"am";switch(token){case"a":case"aa":return localize.dayPeriod(dayPeriodEnumValue,{width:"abbreviated",context:"formatting"});case"aaa":return localize.dayPeriod(dayPeriodEnumValue,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return localize.dayPeriod(dayPeriodEnumValue,{width:"narrow",context:"formatting"});default:return localize.dayPeriod(dayPeriodEnumValue,{width:"wide",context:"formatting"})}},b:function(date,token,localize){const hours=date.getHours();let dayPeriodEnumValue;switch(dayPeriodEnumValue=12===hours?dayPeriodEnum_noon:0===hours?dayPeriodEnum_midnight:hours/12>=1?"pm":"am",token){case"b":case"bb":return localize.dayPeriod(dayPeriodEnumValue,{width:"abbreviated",context:"formatting"});case"bbb":return localize.dayPeriod(dayPeriodEnumValue,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return localize.dayPeriod(dayPeriodEnumValue,{width:"narrow",context:"formatting"});default:return localize.dayPeriod(dayPeriodEnumValue,{width:"wide",context:"formatting"})}},B:function(date,token,localize){const hours=date.getHours();let dayPeriodEnumValue;switch(dayPeriodEnumValue=hours>=17?dayPeriodEnum_evening:hours>=12?dayPeriodEnum_afternoon:hours>=4?dayPeriodEnum_morning:dayPeriodEnum_night,token){case"B":case"BB":case"BBB":return localize.dayPeriod(dayPeriodEnumValue,{width:"abbreviated",context:"formatting"});case"BBBBB":return localize.dayPeriod(dayPeriodEnumValue,{width:"narrow",context:"formatting"});default:return localize.dayPeriod(dayPeriodEnumValue,{width:"wide",context:"formatting"})}},h:function(date,token,localize){if("ho"===token){let hours=date.getHours()%12;return 0===hours&&(hours=12),localize.ordinalNumber(hours,{unit:"hour"})}return lightFormatters.h(date,token)},H:function(date,token,localize){return"Ho"===token?localize.ordinalNumber(date.getHours(),{unit:"hour"}):lightFormatters.H(date,token)},K:function(date,token,localize){const hours=date.getHours()%12;return"Ko"===token?localize.ordinalNumber(hours,{unit:"hour"}):addLeadingZeros(hours,token.length)},k:function(date,token,localize){let hours=date.getHours();return 0===hours&&(hours=24),"ko"===token?localize.ordinalNumber(hours,{unit:"hour"}):addLeadingZeros(hours,token.length)},m:function(date,token,localize){return"mo"===token?localize.ordinalNumber(date.getMinutes(),{unit:"minute"}):lightFormatters.m(date,token)},s:function(date,token,localize){return"so"===token?localize.ordinalNumber(date.getSeconds(),{unit:"second"}):lightFormatters.s(date,token)},S:function(date,token){return lightFormatters.S(date,token)},X:function(date,token,_localize){const timezoneOffset=date.getTimezoneOffset();if(0===timezoneOffset)return"Z";switch(token){case"X":return formatTimezoneWithOptionalMinutes(timezoneOffset);case"XXXX":case"XX":return formatTimezone(timezoneOffset);default:return formatTimezone(timezoneOffset,":")}},x:function(date,token,_localize){const timezoneOffset=date.getTimezoneOffset();switch(token){case"x":return formatTimezoneWithOptionalMinutes(timezoneOffset);case"xxxx":case"xx":return formatTimezone(timezoneOffset);default:return formatTimezone(timezoneOffset,":")}},O:function(date,token,_localize){const timezoneOffset=date.getTimezoneOffset();switch(token){case"O":case"OO":case"OOO":return"GMT"+formatTimezoneShort(timezoneOffset,":");default:return"GMT"+formatTimezone(timezoneOffset,":")}},z:function(date,token,_localize){const timezoneOffset=date.getTimezoneOffset();switch(token){case"z":case"zz":case"zzz":return"GMT"+formatTimezoneShort(timezoneOffset,":");default:return"GMT"+formatTimezone(timezoneOffset,":")}},t:function(date,token,_localize){return addLeadingZeros(Math.trunc(date.getTime()/1e3),token.length)},T:function(date,token,_localize){return addLeadingZeros(date.getTime(),token.length)}};function formatTimezoneShort(offset,delimiter=""){const sign=offset>0?"-":"+",absOffset=Math.abs(offset),hours=Math.trunc(absOffset/60),minutes=absOffset%60;return 0===minutes?sign+String(hours):sign+String(hours)+delimiter+addLeadingZeros(minutes,2)}function formatTimezoneWithOptionalMinutes(offset,delimiter){if(offset%60==0){return(offset>0?"-":"+")+addLeadingZeros(Math.abs(offset)/60,2)}return formatTimezone(offset,delimiter)}function formatTimezone(offset,delimiter=""){const sign=offset>0?"-":"+",absOffset=Math.abs(offset);return sign+addLeadingZeros(Math.trunc(absOffset/60),2)+delimiter+addLeadingZeros(absOffset%60,2)}const dateLongFormatter=(pattern,formatLong)=>{switch(pattern){case"P":return formatLong.date({width:"short"});case"PP":return formatLong.date({width:"medium"});case"PPP":return formatLong.date({width:"long"});default:return formatLong.date({width:"full"})}},timeLongFormatter=(pattern,formatLong)=>{switch(pattern){case"p":return formatLong.time({width:"short"});case"pp":return formatLong.time({width:"medium"});case"ppp":return formatLong.time({width:"long"});default:return formatLong.time({width:"full"})}},longFormatters={p:timeLongFormatter,P:(pattern,formatLong)=>{const matchResult=pattern.match(/(P+)(p+)?/)||[],datePattern=matchResult[1],timePattern=matchResult[2];if(!timePattern)return dateLongFormatter(pattern,formatLong);let dateTimeFormat;switch(datePattern){case"P":dateTimeFormat=formatLong.dateTime({width:"short"});break;case"PP":dateTimeFormat=formatLong.dateTime({width:"medium"});break;case"PPP":dateTimeFormat=formatLong.dateTime({width:"long"});break;default:dateTimeFormat=formatLong.dateTime({width:"full"})}return dateTimeFormat.replace("{{date}}",dateLongFormatter(datePattern,formatLong)).replace("{{time}}",timeLongFormatter(timePattern,formatLong))}},dayOfYearTokenRE=/^D+$/,weekYearTokenRE=/^Y+$/,throwTokens=["D","DD","YY","YYYY"];function isDate(value){return value instanceof Date||"object"==typeof value&&"[object Date]"===Object.prototype.toString.call(value)}function isValid(date){if(!isDate(date)&&"number"!=typeof date)return!1;const _date=(0,toDate.a)(date);return!isNaN(Number(_date))}const formattingTokensRegExp=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,longFormattingTokensRegExp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,escapedStringRegExp=/^'([^]*?)'?$/,doubleQuoteRegExp=/''/g,unescapedLatinCharacterRegExp=/[a-zA-Z]/;function format(date,formatStr,options){const defaultOptions=(0,_lib_defaultOptions.q)(),locale=options?.locale??defaultOptions.locale??enUS,firstWeekContainsDate=options?.firstWeekContainsDate??options?.locale?.options?.firstWeekContainsDate??defaultOptions.firstWeekContainsDate??defaultOptions.locale?.options?.firstWeekContainsDate??1,weekStartsOn=options?.weekStartsOn??options?.locale?.options?.weekStartsOn??defaultOptions.weekStartsOn??defaultOptions.locale?.options?.weekStartsOn??0,originalDate=(0,toDate.a)(date);if(!isValid(originalDate))throw new RangeError("Invalid time value");let parts=formatStr.match(longFormattingTokensRegExp).map((substring=>{const firstCharacter=substring[0];if("p"===firstCharacter||"P"===firstCharacter){return(0,longFormatters[firstCharacter])(substring,locale.formatLong)}return substring})).join("").match(formattingTokensRegExp).map((substring=>{if("''"===substring)return{isToken:!1,value:"'"};const firstCharacter=substring[0];if("'"===firstCharacter)return{isToken:!1,value:cleanEscapedString(substring)};if(formatters[firstCharacter])return{isToken:!0,value:substring};if(firstCharacter.match(unescapedLatinCharacterRegExp))throw new RangeError("Format string contains an unescaped latin alphabet character `"+firstCharacter+"`");return{isToken:!1,value:substring}}));locale.localize.preprocessor&&(parts=locale.localize.preprocessor(originalDate,parts));const formatterOptions={firstWeekContainsDate,weekStartsOn,locale};return parts.map((part=>{if(!part.isToken)return part.value;const token=part.value;(!options?.useAdditionalWeekYearTokens&&function isProtectedWeekYearToken(token){return weekYearTokenRE.test(token)}(token)||!options?.useAdditionalDayOfYearTokens&&function isProtectedDayOfYearToken(token){return dayOfYearTokenRE.test(token)}(token))&&function warnOrThrowProtectedError(token,format,input){const _message=function message(token,format,input){const subject="Y"===token[0]?"years":"days of the month";return`Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}(token,format,input);if(console.warn(_message),throwTokens.includes(token))throw new RangeError(_message)}(token,formatStr,String(date));return(0,formatters[token[0]])(originalDate,token,locale.localize,formatterOptions)})).join("")}function cleanEscapedString(input){const matched=input.match(escapedStringRegExp);return matched?matched[1].replace(doubleQuoteRegExp,"'"):input}},"../../node_modules/date-fns/isAfter.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{d:()=>isAfter});var _toDate_mjs__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/date-fns/toDate.mjs");function isAfter(date,dateToCompare){const _date=(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(date),_dateToCompare=(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(dateToCompare);return _date.getTime()>_dateToCompare.getTime()}},"../../node_modules/date-fns/isBefore.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Y:()=>isBefore});var _toDate_mjs__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/date-fns/toDate.mjs");function isBefore(date,dateToCompare){return+(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(date)<+(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(dateToCompare)}},"../../node_modules/date-fns/isEqual.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{n:()=>isEqual});var _toDate_mjs__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/date-fns/toDate.mjs");function isEqual(leftDate,rightDate){return+(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(leftDate)==+(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(rightDate)}},"../../node_modules/date-fns/startOfDay.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{o:()=>startOfDay});var _toDate_mjs__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/date-fns/toDate.mjs");function startOfDay(date){const _date=(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(date);return _date.setHours(0,0,0,0),_date}},"../../node_modules/date-fns/startOfYear.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{D:()=>startOfYear});var _toDate_mjs__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("../../node_modules/date-fns/toDate.mjs"),_constructFrom_mjs__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("../../node_modules/date-fns/constructFrom.mjs");function startOfYear(date){const cleanDate=(0,_toDate_mjs__WEBPACK_IMPORTED_MODULE_0__.a)(date),_date=(0,_constructFrom_mjs__WEBPACK_IMPORTED_MODULE_1__.w)(date,0);return _date.setFullYear(cleanDate.getFullYear(),0,1),_date.setHours(0,0,0,0),_date}},"../../node_modules/date-fns/toDate.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{function toDate(argument){const argStr=Object.prototype.toString.call(argument);return argument instanceof Date||"object"==typeof argument&&"[object Date]"===argStr?new argument.constructor(+argument):"number"==typeof argument||"[object Number]"===argStr||"string"==typeof argument||"[object String]"===argStr?new Date(argument):new Date(NaN)}__webpack_require__.d(__webpack_exports__,{a:()=>toDate})}}]);