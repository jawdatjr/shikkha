/* Ashik Shikkha POS — five genuinely different premium receipt layouts (v23).
   Loaded AFTER the unchanged Original Travel v22 renderer. Offline only. */
(function(){
'use strict';
var original=window.ShikkhaReceiptTicket;
if(!original || typeof original.render!=='function')return;
var originalRender=original.render;
function premiumRender(o,callback){
 var d=o.receiptData||{},s=o.settings||{},t=o.theme||{};
 var style=t.receiptStyle||'original';
 if(!/^(executive|luxury|boarding|minimal|darkvip)$/.test(style))return originalRender(o,callback);
 var canvas=document.createElement('canvas'),w=392,h=502,scale=3;
 canvas.width=w*scale;canvas.height=h*scale;
 var c=canvas.getContext('2d');if(!c){callback(canvas,d);return;}
 c.setTransform(scale,0,0,scale,0,0);
 var font='"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif';
 var main=t.primary||'#243c65',deep=t.secondary||'#162746',edge=t.border||'#bacad7';
 var ink='#182939',muted='#627485',white='#ffffff';
 var isDark=style==='darkvip';
 function rect(x,y,width,height,fill){c.fillStyle=fill;c.fillRect(x,y,width,height);}
 function rr(x,y,width,height,r,fill,stroke,lineWidth){c.beginPath();c.roundRect(x,y,width,height,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=lineWidth||1;c.strokeStyle=stroke;c.stroke();}}
 function line(x,y,x2,y2,color,lw){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color||edge;c.lineWidth=lw||1;c.stroke();}
 function txt(str,x,y,size,color,weight,max,align,mono){
   c.save();c.font=(weight||700)+' '+size+'px '+(mono?'ui-monospace,SFMono-Regular,Consolas,monospace':font);
   var value=String(str==null?'':str);
   if(max&&c.measureText(value).width>max){
     var items=Array.from(value),end='…',low=0,high=items.length;
     while(low<high){var mid=Math.ceil((low+high)/2);if(c.measureText(items.slice(0,mid).join('')+end).width<=max)low=mid;else high=mid-1;}
     value=items.slice(0,low).join('')+end;
   }
   c.textAlign=align||'left';c.textBaseline='alphabetic';c.fillStyle=color||ink;c.fillText(value,x,y);c.restore();
 }
 function wrap(str,max,size,weight){
   c.save();c.font=(weight||700)+' '+size+'px '+font;
   var words=String(str||'—').trim().replace(/\s+/g,' ').split(' '),rows=[''];
   words.forEach(function(word){var i=rows.length-1,trying=rows[i]?rows[i]+' '+word:word;
     if(c.measureText(trying).width<=max||!rows[i])rows[i]=trying;else rows.push(word);});
   if(rows.length>2)rows=[rows[0],rows.slice(1).join(' ')];
   c.restore();return rows;
 }
 function eventText(x,y,width,color,size){var arr=wrap(d.eventName,width,size||11.4,800);txt(arr[0],x,y,size||11.4,color,800,width);if(arr[1])txt(arr[1],x,y+15,size||11.4,color,780,width);}
 function amount(v){return typeof o.formatCurrency==='function'?String(o.formatCurrency(v,!!d.useBangla)):String(v==null?0:v);}
 function words(){return typeof o.numberToBanglaWords==='function'?String(o.numberToBanglaWords(d.advance)):amount(d.advance)+' টাকা মাত্র';}
 function method(x,y,color,width){txt('PAID VIA  '+String(d.paymentMethod||'Cash')+(d.trxId?'   •   TRX: '+d.trxId:''),x,y,9,color,850,width);}
 function field(k,v,x,y,max,color,lc){txt(k,x,y,8.5,lc||muted,850,max);txt(v||'—',x,y+16,11.5,color||ink,770,max);}
 // QR payload intentionally matches the Original Travel QR for shared verification.
 function qr(x,y,size){
   if(d.showQr===false||typeof o.qrcode!=='function')return;
   try{var q=o.qrcode(0,'M');q.addData('INV:'+String(d.invoice||'')+'\nSEC:'+String(d.securityCode||'')+'\nAMT:'+String(Number(d.total)||0),'Byte');q.make();
     var n=q.getModuleCount(),quiet=4,pad=4,usable=size-pad*2,step=usable/(n+2*quiet);
     rr(x,y,size,size,5,'#fff','#d9e0e2',.8);c.fillStyle='#132b37';
     for(var r=0;r<n;r++)for(var col=0;col<n;col++)if(q.isDark(r,col))c.fillRect(x+pad+(col+quiet)*step,y+pad+(r+quiet)*step,step+.012,step+.012);
   }catch(err){if(window.console)console.warn('Premium receipt QR failed',err);}
 }
 function seal(x,y,width,height){
   if(d.showStamp===false)return;
   c.save();c.globalAlpha=.13;c.translate(x,y);c.rotate(-.06);
   rr(-width/2,-height/2,width,height,3,null,main,1.5);
   txt('OFFICIAL • VERIFIED',0,-4,7,main,900,width-7,'center');
   txt(Number(d.due)>0?'BOOKED • DUE':'FULLY PAID',0,9,7,main,900,width-7,'center');c.restore();
 }
 function bottomFooter(bg,fg){rect(12,489,368,12,bg);txt(s.footerNotice||'Advance Money is not Refundable',196,497.7,9.1,fg,900,348,'center');}
 function verification(x,codeY,issuerY,color,span){
   txt('VERIFIED TRAVEL PASS',x,codeY-14,8.2,color,900,span);
   txt(d.securityCode||'—',x,codeY,8.7,color,850,span);
   txt('Issued By: '+String(d.salesman||'—'),x,issuerY,8.8,color,850,span);
 }
 var signed={x:0,y:0,w:0,h:0}, logo={x:0,y:0,w:0,h:0};
 if(style==='executive'){
   // EXECUTIVE FLIGHT FOLIO: architectural navy masthead, asymmetric two-column metadata.
   rect(0,0,392,502,'#f6f8fc');rect(0,0,392,125,'#142b4b');rect(0,0,7,502,main);
   rect(12,5,368,4,'#c8a869');
   txt('PRIVATE TRAVEL DESK  /  OFFICIAL INVOICE',23,22,8,'#c6d7e6',850,325);
   rr(22,33,33,33,7,'#294d78');txt('✈',29,56,20,'#fff',850,23);
   txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',64,48,14.1,'#fff',900,200);
   txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',64,66,8.1,'#aecce1',850,200);
   rr(279,34,93,32,4,'#d7bc7b');txt('EXECUTIVE',325,47,9,'#203250',900,86,'center');txt('RECEIPT',325,58,8,'#203250',900,86,'center');
   txt([s.phone1,s.phone2].filter(Boolean).join('  •  '),22,93,8,'#e1eefa',750,347);
   txt(String(s.address||''),22,111,8,'#b6ccdd',750,348);
   rr(22,133,168,42,7,'#fff','#dce4ef',.9);rr(199,133,174,42,7,'#fff','#dce4ef',.9);
   field('REFERENCE / INVOICE',d.invoice,30,148,151,'#12294a','#516f92');
   field('DATE',d.date,208,148,152,'#12294a','#516f92');
   txt('TRAVELLER',22,191,8.5,main,900,112);txt(d.customerName||'—',22,209,16,ink,900,348);
   txt('CONTACT',22,228,8.5,muted,900,94);txt(d.customerContact||'—',100,228,10.4,ink,750,273);
   txt('ADDRESS',22,245,8.5,muted,900,94);txt(d.customerAddress||'—',100,245,10.4,ink,750,273);
   rr(22,259,351,63,7,'#e5eef8');rect(22,259,4,63,main);
   txt('ITINERARY / EVENT',34,276,8.5,main,900,193);
   if(d.seatNumbers)txt('SEATS  '+d.seatNumbers,360,276,8,main,850,110,'right');
   eventText(34,294,327,ink,12.2);
   rr(22,331,351,56,7,'#1a385d');
   [['TOTAL',d.total],['ADVANCE',d.advance],['DUE',d.due]].forEach(function(a,i){
     var x=32+i*116;txt(a[0],x,346,8.8,'#d5e5f3',850,109);txt(amount(a[1]),x,372,17,i===2?'#e6c589':'#fff',900,107);if(i<2)line(x+105,342,x+105,376,'#6687a2',.8);
   });
   txt('ADVANCE IN WORDS',22,401,8.2,main,900,170);txt(words(),22,416,10,ink,750,351);
   method(22,431,deep,351);line(22,437,373,437,'#c7d9e8',.8);
   verification(22,454,477,deep,152);
   seal(237,454,85,37);line(185,475,282,475,deep,.8);
   txt(s.signatoryLabel||'Authorized Signature',282,486,7.1,deep,850,102,'right');
   qr(297,417,76); signed={x:192,y:438,w:87,h:30};logo={x:26,y:36,w:25,h:25};
   bottomFooter('#142b4b','#fff');
 }else if(style==='luxury'){
   // HERITAGE GOLD: centered letterpress / ceremonial certificate-like *detailing*, compact receipt size.
   rect(0,0,392,502,'#fffaf0');rr(5,5,382,491,7,null,'#b58a47',1.4);rr(11,11,370,479,6,null,'#e6d0a3',.7);
   rect(26,20,340,3,'#bb924e');
   txt('✦  HERITAGE COLLECTION  ✦',196,38,8.5,'#866430',900,289,'center');
   txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',196,59,16.3,'#6f4b20',900,313,'center');
   txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',196,77,9,'#89673c',850,324,'center');
   txt('O F F I C I A L   M O N E Y   R E C E I P T',196,95,9.1,'#a0783e',850,321,'center');
   txt([s.phone1,s.phone2].filter(Boolean).join('  •  '),196,108,7.7,'#78694f',750,340,'center');
   line(25,117,367,117,'#bd995d',1);
   field('INVOICE NUMBER',d.invoice,27,133,223,'#5b4224','#9a7747');
   field('ISSUE DATE',d.date,255,133,111,'#5b4224','#9a7747');
   line(25,161,367,161,'#dcc69f',.8);
   field('TRAVELLER NAME',d.customerName,27,176,338,'#34281b','#9a7747');
   field('MOBILE / CONTACT',d.customerContact,27,210,158,'#34281b','#9a7747');
   field('ADDRESS',d.customerAddress,192,210,174,'#34281b','#9a7747');
   rr(24,244,344,48,3,'#f7edda','#d5b682',.85);
   txt('EVENT / TOUR',35,259,8.5,'#946f37',900,170);
   if(d.seatNumbers)txt('SEAT: '+d.seatNumbers,356,259,8,'#946f37',800,144,'right');
   eventText(35,275,320,'#4d3924',11.4);
   txt('PAYMENT SUMMARY',196,308,8.9,'#866430',900,200,'center');
   [['TOTAL',d.total],['ADVANCE',d.advance],['COLLECTABLE',d.due]].forEach(function(a,i){var x=25+i*117;
     rr(x,315,107,45,3,'#fffcf5','#d6b87f',.95);txt(a[0],x+53,328,8.4,'#97703b',900,100,'center');txt(amount(a[1]),x+53,349,15,'#63421e',900,97,'center');
   });
   txt('ADVANCE PAID IN WORDS / কথায়',26,373,8.8,'#876337',900,336);
   txt(words(),26,390,10.7,'#422f1c',780,338);method(26,409,'#755731',337);
   line(25,416,367,416,'#ccb184',.85);
   qr(25,419,64);verification(97,436,468,'#694c28',163);
   seal(313,445,94,43);line(265,468,368,468,'#b58a47',.85);
   txt(s.signatoryLabel||'Authorized Signature',368,481,7,'#6c4c23',850,108,'right');
   signed={x:272,y:427,w:89,h:32};logo={x:27,y:28,w:23,h:23};
   bottomFooter('#97703d','#fff');
 }else if(style==='boarding'){
   // BOARDING GATE: airline boarding pass with tear line, gate tag and destination-like event hero.
   rect(0,0,392,502,'#fff');rect(0,0,392,104,'#39266a');
   rect(0,0,392,5,'#a791e3');
   for(var sl=0;sl<80;sl+=14){line(307+sl,0,277+sl,103,'#4d3880',5);}
   txt('✈  TRAVEL • BOARDING PASS',22,24,10.5,'#f9f5ff',900,251);
   txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',22,51,16.4,'#fff',900,295);
   txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',22,68,8.6,'#d9cef2',900,283);
   txt([s.phone1,s.phone2].filter(Boolean).join(' • '),22,86,7.9,'#e4ddf5',770,348);
   var cells=[{x:22,cap:162,k:'TICKET NO.',v:d.invoice},{x:196,cap:98,k:'DATE',v:d.date},{x:310,cap:63,k:'SEAT',v:d.seatNumbers||'—'}];
   cells.forEach(function(cell){txt(cell.k,cell.x,121,8.6,'#79669b',900,cell.cap);txt(cell.v||'—',cell.x,142,11.2,'#2c204c',900,cell.cap);});
   line(22,154,372,154,'#d6c9e6',.9);
   txt('YOUR EXPERIENCE  /  EVENT',22,170,8.8,'#7655ac',900,315);
   eventText(22,190,348,'#34205a',15);
   rr(22,228,350,63,5,'#f5f0ff');
   field('PASSENGER / BOOKED BY',d.customerName,34,244,326,'#31244e','#7966a3');
   txt('CONTACT  '+String(d.customerContact||'—'),34,276,9.6,'#443466',800,327);
   txt('ADDRESS',22,308,8.3,'#7966a3',900,90);
   txt(d.customerAddress||'—',103,308,10.5,'#30244d',770,268);
   rr(22,322,215,63,8,'#422a79');
   txt('ADVANCE PAID',35,339,9,'#ddd1fa',900,187);txt(amount(d.advance),35,370,23,'#fff',900,192);
   rr(246,322,126,29,4,'#f1ecfc');rr(246,356,126,29,4,'#f1ecfc');
   txt('TOTAL',257,335,8,'#72549b',900,43);txt(amount(d.total),360,342,13,'#30214c',900,94,'right');
   txt('DUE',257,369,8,'#72549b',900,43);txt(amount(d.due),360,376,13,'#7d4080',900,94,'right');
   txt('IN WORDS',22,399,8.2,'#6b5196',900,89);txt(words(),95,399,9.3,'#34234f',750,275);
   method(22,412,'#59407b',350);
   // Tear line and symmetric punched notches are visually different from other themes.
   c.beginPath();c.arc(0,423,10,0,Math.PI*2);c.fillStyle='#eee7f9';c.fill();
   c.beginPath();c.arc(392,423,10,0,Math.PI*2);c.fill();
   c.save();c.setLineDash([4,4]);line(15,423,377,423,'#a98ccf',.9);c.restore();
   txt('TRAVEL VERIFIED',22,439,8,'#4d3078',900,175);
   txt(d.securityCode||'—',22,452,8.8,'#34234f',800,250);
   txt('Issued By: '+String(d.salesman||'—'),22,467,8.7,'#4d3078',850,210);
   seal(241,451,85,36);line(191,477,278,477,'#8d78b7',.8);
   txt(s.signatoryLabel||'Authorized Signature',277,486,6.9,'#594280',800,100,'right');
   qr(292,424,63);signed={x:193,y:438,w:84,h:30};logo={x:340,y:32,w:24,h:24};
   bottomFooter('#39266a','#fff');
 }else if(style==='minimal'){
   // EDITORIAL MINIMAL: typography, negative space, left rule, non-card two-column finance ledger.
   rect(0,0,392,502,'#fff');rect(0,0,5,502,'#102c36');
   txt('A / S  •  TRAVEL STUDIO',22,20,8.5,'#7a929b',900,205);
   txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',22,41,14.6,'#102c36',900,335);
   txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',22,56,8.1,'#527079',800,327);
   txt([s.phone1,s.phone2].filter(Boolean).join(' • '),22,70,7.5,'#527079',780,336);
   txt('RECEIPT',19,109,42,'#132e37',900,354);line(22,119,371,119,'#162f39',1.35);
   field('INVOICE REFERENCE',d.invoice,22,135,210,'#132e37','#5f7a84');
   field('DATE',d.date,251,135,120,'#132e37','#5f7a84');
   line(22,174,371,174,'#dce8eb',.9);
   txt('01',22,193,9,'#73919a',900,22);txt('CUSTOMER',51,193,8.6,'#73919a',900,110);
   txt(d.customerName||'—',51,213,14,'#162d34',900,315);
   txt('02',22,232,9,'#73919a',900,22);txt('CONTACT',51,232,8.6,'#73919a',900,110);
   txt(d.customerContact||'—',149,232,10.6,'#213a43',800,223);
   txt(d.customerAddress||'—',51,253,10.2,'#41626d',750,319);
   rect(22,268,349,56,'#f0f5f4');rect(22,268,4,56,'#266d66');
   txt('03  /  EVENT',34,284,8.7,'#3c766f',900,216);eventText(34,303,320,'#183d3b',11.5);
   if(d.seatNumbers)txt('SEAT  '+d.seatNumbers,370,335,8,'#51716e',800,340,'right');
   line(22,344,371,344,'#dce5e4',.9);
   txt('TOTAL',22,359,8.7,'#73919a',900,114);txt(amount(d.total),22,384,21,'#122f38',900,181);
   line(208,351,208,398,'#d8e4e6',.9);
   txt('ADVANCE',226,359,8.4,'#73919a',900,140);txt(amount(d.advance),226,375,13,'#1a6c62',900,142);
   txt('DUE',226,388,8.1,'#73919a',900,80);txt(amount(d.due),270,392,12,'#193640',900,101,'right');
   txt('IN WORDS  /  কথায়',22,412,8.5,'#5b7a83',900,110);txt(words(),136,412,9.5,'#233d42',770,234);
   method(22,427,'#26655e',349);line(22,432,371,432,'#d3e0e1',.9);
   qr(22,436,50);verification(81,453,477,'#214750',188);
   seal(316,452,86,37);line(278,473,369,473,'#8fa8ad',.8);
   txt(s.signatoryLabel||'Authorized Signature',369,486,7,'#486a72',850,108,'right');
   signed={x:281,y:437,w:85,h:32};logo={x:341,y:20,w:22,h:22};
   bottomFooter('#163941','#fff');
 }else{
   // OBSIDIAN VIP: dark metallic panel, amber frame, negative gold footer.
   rect(0,0,392,502,'#101725');rr(5,5,382,492,8,null,'#8f754d',1.1);
   rect(16,16,360,3,'#c2a46b');
   txt('✦  PRIVATE • VIP TRAVEL',22,35,9.2,'#e0c690',900,224);
   rr(291,24,79,25,5,'#cbb078');txt('VIP PASS',330,41,9.7,'#1a2230',900,74,'center');
   txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',22,62,16,'#fff9ed',900,343);
   txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',22,77,8.5,'#c8bb9e',850,337);
   txt([s.phone1,s.phone2].filter(Boolean).join('  •  '),22,94,7.7,'#aebcd1',750,343);
   line(22,105,369,105,'#6d5c47',.9);
   rr(22,115,347,46,5,'#1d2839','#6e644e',.8);
   field('BOOKING REF',d.invoice,33,130,199,'#fff9e8','#c1a876');
   field('ISSUED ON',d.date,256,130,105,'#fff9e8','#c1a876');
   txt('BOOKED FOR',22,182,8.5,'#c5aa73',900,126);
   txt(d.customerName||'—',22,203,16,'#fff',900,340);
   txt('CONTACT   '+String(d.customerContact||'—'),22,221,9.5,'#c0cad8',770,346);
   txt('ADDRESS   '+String(d.customerAddress||'—'),22,237,9.2,'#c0cad8',770,346);
   rr(22,249,347,61,6,'#232e40','#6b5a43',.75);
   txt('TRAVEL EXPERIENCE / EVENT',34,266,8.2,'#d8b97d',900,250);
   if(d.seatNumbers)txt('SEAT '+d.seatNumbers,358,266,7.8,'#d8b97d',820,108,'right');
   eventText(34,283,324,'#fff9ed',11.7);
   [['TOTAL',d.total],['ADVANCE',d.advance],['DUE',d.due]].forEach(function(a,i){var x=22+i*118;
      rr(x,321,110,53,5,i===1?'#bc9e65':'#1c293c',i===1?'#e0c690':'#847254',.9);
      txt(a[0],x+9,338,8.8,i===1?'#1d2330':'#c8ac78',900,90);
      txt(amount(a[1]),x+9,360,16.4,i===1?'#152033':'#fff7e5',900,91);
   });
   txt('ADVANCE IN WORDS',22,391,8.5,'#d0b27b',900,152);
   txt(words(),22,406,10.4,'#eef1f5',740,346);
   method(22,423,'#dbc08d',347);line(22,428,369,428,'#756b57',.8);
   qr(22,425,63);verification(93,450,479,'#e0c690',174);
   seal(317,451,93,39);line(275,474,369,474,'#c4a46b',.9);
   txt(s.signatoryLabel||'Authorized Signature',369,486,7,'#d6b982',850,105,'right');
   signed={x:281,y:436,w:84,h:29};logo={x:344,y:55,w:20,h:20};
   bottomFooter('#ad925f','#101725');
 }
 // Keep the customer logo and ACTUAL saved signature, always above the low-opacity seal.
 var pending=0,completed=false;
 function finish(){if(pending===0&&!completed){completed=true;callback(canvas,d);}}
 function add(url,where){if(!url||!where.w)return;pending++;var img=new Image();
   img.onload=function(){try{c.save();c.drawImage(img,where.x,where.y,where.w,where.h);c.restore();}catch(e){}pending--;finish();};
   img.onerror=function(){pending--;finish();};img.src=url;}
 add(s.logoDataUrl,logo);add(o.signatureDataUrl,signed);finish();
}
window.ShikkhaReceiptTicket={render:premiumRender};
})();