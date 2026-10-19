/* Ashik Shikkha POS — compact landscape travel ticket (v20).
   Offline canvas renderer shared by preview, PNG and PDF.
   Faithfully follows the classic teal voucher visual layout. */
(function(){
'use strict';
function renderTicket(options,callback){
 var d=options.receiptData||{},s=options.settings||{},t=options.theme||{};
 var canvas=document.createElement('canvas'),w=557,h=432;
 var scale=3;
 canvas.width=w*scale;canvas.height=h*scale;
 var c=canvas.getContext('2d');
 if(!c){callback(canvas,d);return;}
 c.setTransform(scale,0,0,scale,0,0);
 var main=t.primary||'#008996',deep=t.secondary||'#005a63',light=t.light||'#e6f6f8',edge=t.border||'#6ec4cf';
 var font='"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif';
 var ink='#0f3943',dark='#0f172a';
 function rect(x,y,bw,bh,color){c.fillStyle=color;c.fillRect(x,y,bw,bh);}
 function rr(x,y,bw,bh,r,fill,stroke,lw){
   c.beginPath();c.roundRect(x,y,bw,bh,r);
   if(fill){c.fillStyle=fill;c.fill();}
   if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||1;c.stroke();}
 }
 function txt(str,x,y,size,color,bold,maxW,align){
   c.save();c.font=(bold||700)+' '+size+'px '+font;
   c.fillStyle=color||ink;c.textBaseline='alphabetic';c.textAlign=align||'left';
   c.fillText(String(str==null?'':str),x,y,maxW||550);c.restore();
 }
 function line(x,y,x2,y2,color,lw){
   c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.lineWidth=lw||1;c.strokeStyle=color||edge;c.stroke();
 }
 function money(value){return String(options.formatCurrency(value,!!d.useBangla));}
 // frame, security graph paper and striped ticket stub, exactly like the old voucher.
 rect(0,0,w,h,'#ffffff');
 c.save();c.beginPath();c.roundRect(3,2,547,427,6);c.clip();
 c.globalAlpha=.22;c.strokeStyle=light;c.lineWidth=.3;
 for(var gx=13;gx<550;gx+=10){c.beginPath();c.moveTo(gx,22);c.lineTo(gx,407);c.stroke();}
 for(var gy=25;gy<406;gy+=10){c.beginPath();c.moveTo(12,gy);c.lineTo(550,gy);c.stroke();}
 c.globalAlpha=1;
 rect(3,2,10,427,main);
 for(var sty=3;sty<425;sty+=15)rect(4,sty+9,8,5,'#e8f7f9');
 line(13,2,13,427,edge,.9);
 // subtle watermark under actual content
 if(d.showWatermark!==false){
   c.save();c.translate(295,215);c.rotate(-.19);c.globalAlpha=.055;
   txt((s.companyEn||'BRAHMANBARIA TRAVELLERS')+' • VERIFIED',0,0,27,main,900,470,'center');
   line(-217,11,218,11,main,1);c.restore();
 }
 // slim official ticket banner
 rect(14,3,535,18,light);
 txt('✈  🚌  TOUR & TRAVEL BOOKING VOUCHER • OFFICIAL MONEY RECEIPT',25,15,7.3,deep,900,363);
 txt('BOOKING REF: #'+String(d.invoice||'—').slice(0,40)+' • '+String(d.securityCode||'').slice(0,32),538,15,6.5,deep,800,190,'right');
 line(14,21,549,21,edge,.8);
 // travel logo, brand, booking badge and contact details
 rr(25,45,36,36,8,main);
 txt('✈',32,70,23,'#ffffff',850,23);
 txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',68,62,17,main,900,340);
 txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',68,89,8.4,deep,900,320);
 rr(429,34,102,22,3,main);
 txt(s.receiptBadge||'Money Receipt',480,48,11.3,'#ffffff',900,95,'center');
 var contacts=[s.phone1,s.phone2].filter(Boolean).join(' • ');
 txt('☎ '+contacts,531,65,7.6,deep,850,148,'right');
 if(s.bkashNumber)txt('bKash: '+s.bkashNumber,531,75,7.5,'#b60060',900,160,'right');
 var address=String(s.address||'').trim();
 if(address){
   txt(address,531,s.bkashNumber?86:79,7.3,deep,650,198,'right');
 }else if(!s.bkashNumber){
   txt('Tour & Travel Booking Office',531,82,7.3,deep,650,185,'right');
 }
 line(25,108,531,108,main,1);
 // classic single-line booking form.
 txt('Invoice:',26,129,10,deep,900,60);
 rr(68,118,Math.min(185,Math.max(40,String(d.invoice||'').length*6.2+14)),23,3,'#f3f6fa','#cbd5e1',.6);
 txt(d.invoice||'—',75,133,12,dark,800,179);
 txt('Date:',392,131,10,main,900,40);
 txt(d.date||'—',530,131,13,dark,800,110,'right');
 line(392,137,531,137,edge,1);
 function formRow(label,value,y,other){
   txt(label,26,y,9.3,deep,900,75);
   txt(value||'—',76,y,10.8,dark,760,other?380:449);
   if(other&&other.text){
     rr(other.x||475,y-12,56,14,4,'#eef3f5','#d7e2e6',.5);
     txt(other.text,528,y-2,7.1,ink,800,52,'right');
   }
   line(25,y+9,531,y+9,edge,.9);
 }
 formRow('Name:',String(d.customerName||'').trim(),155,
  d.paxOrQty?{text:'('+d.paxOrQty+')',x:488}:null);
 formRow('Address:',d.customerAddress,179);
 formRow('Contact:',d.customerContact,203);
 formRow('Event Name:',d.eventName,227,
  d.seatNumbers?{text:'💺 '+d.seatNumbers,x:475}:null);
 // Three pill totals and their original horizontal placement
 function amountPill(x,y,pw,val,color){
   rr(x,y,pw,20,11,'#ffffff',color||main,1);
   txt(money(val),x+pw/2,y+14.5,10,color||deep,900,pw-10,'center');
 }
 txt('Total:',26,260,9.5,deep,900);
 amountPill(60,247,77,d.total,main);
 txt('Advance:',163,260,9.5,deep,900);
 amountPill(232,247,77,d.advance,main);
 txt('Collectable Amount:',325,260,9.2,deep,900,129);
 amountPill(454,247,77,d.due,d.due>0?'#c91854':main);
 rect(25,274,507,24,'#e5f7fa');c.strokeStyle=edge;c.lineWidth=.8;c.strokeRect(25,274,507,24);
 txt('কথায় (Advance Paid in Words):',29,288,8.5,deep,900,160);
 var banglaWords=(typeof options.numberToBanglaWords==='function')?options.numberToBanglaWords(d.advance):money(d.advance)+' টাকা মাত্র';
 txt(banglaWords,174,288,8.8,dark,750,348);
 // Cash / bKash / Nagad / Bank checkboxes as in screenshot.
 line(25,303,531,303,edge,.9);
 txt('Payment System',26,319,9.5,deep,900,90);
 var methods=['Cash','Bkash','Nagad','Bank'];
 var places=[115,169,225,286];
 methods.forEach(function(m,i){
   var x=places[i],checked=String(d.paymentMethod||'Cash').toLowerCase()===m.toLowerCase();
   c.strokeStyle=main;c.lineWidth=1;c.strokeRect(x,308,13,13);
   if(checked){c.strokeStyle='#082d37';c.lineWidth=1.6;
     c.beginPath();c.moveTo(x+2,314);c.lineTo(x+5,317);c.lineTo(x+11,310);c.stroke();}
   txt(m,x+16,318,9.1,checked?deep:ink,checked?900:700,53);
 });
 if(d.paymentMethod==='Rocket')txt('Rocket ✓',352,318,8.5,deep,850,85);
 if(d.trxId)txt('Trx: '+d.trxId,527,318,8.3,deep,800,155,'right');
 line(25,326,531,326,edge,.9);
 // Compact footer tailored to phone receipt viewing: one scannable QR replaces the barcode.
 function drawQr(){
   if(typeof options.qrcode!=='function')return;
   try{
     var qr=options.qrcode(0,'M');
     qr.addData('INV:'+String(d.invoice||'')+'\nSEC:'+String(d.securityCode||'')+'\nAMT:'+String(Number(d.total)||0),'Byte');
     qr.make();
     var n=qr.getModuleCount(),quiet=4,box=51,step=box/(n+quiet*2);
     // Rounded white QR ticket panel with enough quiet zone for mobile scanning.
     rr(77,332,57,55,5,'#ffffff','#cbdfe4',.7);
     c.fillStyle='#073d49';
     for(var y=0;y<n;y++)for(var x=0;x<n;x++)if(qr.isDark(y,x)){
       c.fillRect(80+(x+quiet)*step,334+(y+quiet)*step,step+.008,step+.008);
     }
   }catch(err){if(window.console)console.warn('Receipt QR unavailable:',err);}
 }
 drawQr();
 txt(String(d.securityCode||'—'),143,348,7.4,dark,900,209);
 txt('VERIFIED TRAVEL PASS',143,361,7.0,'#64748b',850,180);
 txt('Issued By: '+String(d.salesman||'—'),143,376,8,deep,900,213);
 // No separate seal column. The official seal is a light watermark BEHIND the
 // saved real signature and signature line in the right-hand section.
 if(d.showStamp!==false){
   c.save();c.translate(472,358);c.rotate(-.07);c.globalAlpha=.16;
   rr(-57,-20,114,41,3,null,main,1.5);
   txt((s.companyEn||'TRAVEL AGENCY').toUpperCase(),0,-9,6.2,main,900,107,'center');
   rr(-37,-4,74,14,2,null,main,.7);
   txt(d.due>0?'BOOKED • DUE':'FULLY PAID',0,6,7,deep,900,70,'center');
   txt('ISSUED: '+String(d.date||''),0,17,6,deep,850,109,'center');
   c.restore();
 }
 // The signatory remains readable even over the translucent seal.
 line(417,378,530,378,'#46849a',.8);
 txt(s.signatoryLabel||'কর্তৃপক্ষের স্বাক্ষর (Authorized Signature)',529,387,7.1,deep,900,144,'right');
 // anti-copy microline and dark-teal footer
 rect(13,397,536,8,'#e3f4f7');
 txt(('ASHIK SHIKKHA POS • '+(s.companyEn||'TRAVELLERS')+' • '+String(d.securityCode||'')+' • VERIFIED • ').repeat(4),15,402,4.4,main,700,533);
 rect(13,405,536,24,main);
 c.save();c.globalAlpha=.23;c.strokeStyle='#d0f6f9';c.lineWidth=.3;
 for(var fx=14;fx<550;fx+=7){c.beginPath();c.moveTo(fx,405);c.lineTo(fx,429);c.stroke();}
 for(var fy=409;fy<430;fy+=7){c.beginPath();c.moveTo(13,fy);c.lineTo(549,fy);c.stroke();}
 c.restore();
 txt(s.footerNotice||'Advance Money is not Refundable',281,419,11,'#ffffff',900,470,'center');
 c.restore();
 rr(3,2,547,427,6,null,main,1);
 // Keep both saved images; never replace a user's actual signature with a fake signature.
 var pending=0,finished=false;
 function finish(){if(pending===0&&!finished){finished=true;callback(canvas,d);}}
 function imageAsset(url,x,y,iw,ih){
   if(!url)return;
   pending++;var im=new Image();
   im.onload=function(){
     try{c.save();c.drawImage(im,x,y,iw,ih);c.restore();}
     catch(e){}
     pending--;finish();
   };
   im.onerror=function(){pending--;finish();};
   im.src=url;
 }
 imageAsset(s.logoDataUrl,28,48,30,30);
 imageAsset(options.signatureDataUrl,434,342,91,29);
 finish();
}
window.ShikkhaReceiptTicket={render:renderTicket};
})();