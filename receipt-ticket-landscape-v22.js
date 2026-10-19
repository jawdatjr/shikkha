/* Ashik Shikkha POS — v22 compact mobile travel voucher.
   One offline Canvas renderer for Preview, PNG, PDF, print and sharing. */
(function () {
  'use strict';
  function renderTicket(options, callback) {
    var d = options.receiptData || {}, s = options.settings || {}, t = options.theme || {};
    var w = 392, h = 502, scale = 3;
    var canvas = document.createElement('canvas');
    canvas.width = w * scale; canvas.height = h * scale;
    var c = canvas.getContext('2d');
    if (!c) { callback(canvas, d); return; }
    c.setTransform(scale, 0, 0, scale, 0, 0);
    var main = t.primary || '#008996', deep = t.secondary || '#005a63';
    var light = t.light || '#e6f6f8', edge = t.border || '#6ec4cf';
    var font = '"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif';
    var ink = '#123944', dark = '#10263a';
    function rect(x,y,bw,bh,color) { c.fillStyle = color; c.fillRect(x,y,bw,bh); }
    function rr(x,y,bw,bh,r,fill,stroke,lw) {
      c.beginPath(); c.roundRect(x,y,bw,bh,r);
      if (fill) { c.fillStyle=fill; c.fill(); }
      if (stroke) { c.strokeStyle=stroke; c.lineWidth=lw||1; c.stroke(); }
    }
    function line(x,y,x2,y2,color,lw) {
      c.beginPath(); c.moveTo(x,y); c.lineTo(x2,y2);
      c.strokeStyle=color||edge; c.lineWidth=lw||1; c.stroke();
    }
    // Ellipsize overflow; never squash glyphs using canvas.fillText(maxWidth).
    // This also avoids overlapping labels when users enter long Bangla text.
    function fitted(value,maxWidth) {
      var str=String(value==null?'':value);
      if (!maxWidth || c.measureText(str).width<=maxWidth) return str;
      var chars=Array.from(str), suffix='…', lo=0, hi=chars.length;
      while (lo<hi) {
        var mid=Math.ceil((lo+hi)/2);
        if (c.measureText(chars.slice(0,mid).join('')+suffix).width<=maxWidth) lo=mid;
        else hi=mid-1;
      }
      return chars.slice(0,lo).join('')+suffix;
    }
    function txt(value,x,y,size,color,weight,maxWidth,align,mono) {
      c.save();
      c.font=(weight||700)+' '+size+'px '+(mono?'ui-monospace,SFMono-Regular,Consolas,monospace':font);
      c.fillStyle=color||ink; c.textBaseline='alphabetic'; c.textAlign=align||'left';
      c.fillText(fitted(value,maxWidth),x,y); c.restore();
    }
    function wrapTwo(value,maxWidth,size,weight) {
      c.save(); c.font=(weight||700)+' '+size+'px '+font;
      var valueText=String(value||'—').trim().replace(/\s+/g,' ');
      var words=valueText.split(' '), result=[''];
      words.forEach(function(word){
        var last=result.length-1, candidate=result[last]?(result[last]+' '+word):word;
        if (c.measureText(candidate).width<=maxWidth || !result[last]) result[last]=candidate;
        else result.push(word);
      });
      if(result.length>2)result=[result[0],result.slice(1).join(' ')];
      result=result.slice(0,2).map(function(v){return fitted(v,maxWidth);});
      c.restore(); return result;
    }
    function money(value) {
      return typeof options.formatCurrency==='function'
        ? String(options.formatCurrency(value,!!d.useBangla))
        : String(value==null?'0':value);
    }
    // Classic teal edge, flight-ticket pattern and subtle security watermark.
    rect(0,0,w,h,'#ffffff');
    c.save(); c.beginPath(); c.roundRect(2,2,w-4,h-4,8); c.clip();
    c.save(); c.globalAlpha=.2; c.strokeStyle=light; c.lineWidth=.35;
    for(var gx=16;gx<w;gx+=11)line(gx,23,gx,h-21,light,.35);
    for(var gy=24;gy<h-20;gy+=11)line(12,gy,w-8,gy,light,.35);
    c.restore();
    rect(2,2,9,h-4,main);
    for(var sy=5;sy<h-8;sy+=17)rect(3,sy+7,7,6,'#e6f8fa');
    line(11,2,11,h-2,edge,.8);
    if(d.showWatermark!==false) {
      c.save(); c.translate(204,244); c.rotate(-.22); c.globalAlpha=.045;
      txt((s.companyEn||'BRAHMANBARIA TRAVELLERS')+' • VERIFIED',0,0,21,main,900,325,'center');
      c.restore();
    }
    // Slim ticket headline.
    rect(12,3,w-14,19,light);
    txt('✈  TOUR & TRAVEL • OFFICIAL MONEY RECEIPT',21,16,8,deep,900,306);
    txt('✓',376,16,9,main,900,14,'right');
    line(12,22,380,22,edge,.85);
    // Logo, company, ticket badge and contact block.
    rr(22,37,34,34,7,main);
    txt('✈',28,61,24,'#ffffff',900,26);
    txt(s.companyBn||'ব্রাহ্মণবাড়িয়া ট্রাভেলার্স',64,49,15.1,main,900,211);
    txt(s.companyEn||'BRAHMANBARIA TRAVELLERS',64,65,8.4,deep,900,209);
    rr(281,33,94,21,4,main);
    txt(s.receiptBadge||'Money Receipt',328,47,10.5,'#ffffff',900,87,'center');
    var contacts=[s.phone1,s.phone2].filter(Boolean).join(' • ');
    if(contacts)txt('☎ '+contacts,375,65,7.6,deep,750,139,'right');
    if(s.bkashNumber)txt('bKash: '+s.bkashNumber,375,77,7.3,'#b60060',800,152,'right');
    var address=String(s.address||'').trim();
    txt(address||'Tour & Travel Booking Office',375,89,7.2,deep,700,345,'right');
    line(22,99,375,99,main,1.15);
    // Invoice and date are separate, with constrained readable baselines.
    txt('Invoice',22,116,9.8,deep,900,51);
    rr(73,105,188,28,5,'#f0f8fa',edge,.65);
    txt(d.invoice||'—',81,123,11.8,dark,800,173,'left',true);
    txt('Date',270,113,9.3,deep,900,39);
    txt(d.date||'—',375,130,11.9,dark,800,103,'right');
    line(269,136,375,136,edge,.85);
    function row(label,value,y,other) {
      txt(label,22,y,9.8,deep,900,76);
      var cap=other?223:270;
      txt(String(value||'').trim()||'—',104,y,11.6,dark,750,cap);
      if(other) {
        rr(337,y-13,38,16,5,'#f0f8fa','#d4e9ee',.6);
        txt(other,356,y-2,8.4,deep,800,34,'center');
      }
      line(22,y+8,375,y+8,edge,.85);
    }
    row('Name',d.customerName,153,d.paxOrQty?'('+d.paxOrQty+')':null);
    row('Address',d.customerAddress,180);
    row('Contact',d.customerContact,207);
    txt('Event Name',22,230,10,deep,900,112);
    if(d.seatNumbers){
      rr(290,217,85,17,4,'#f2f8fa','#d5e4e8',.6);
      txt('Seat: '+d.seatNumbers,332,229,8,deep,850,79,'center');
    }
    var eventLines=wrapTwo(d.eventName,351,11.5,760);
    txt(eventLines[0],22,246,11.5,dark,760,351);
    if(eventLines[1])txt(eventLines[1],22,261,11,dark,740,351);
    line(22,267,375,267,edge,1);
    // Three amounts; visually grouped in equal-width panels on the phone.
    function amount(x,label,value,color) {
      txt(label,x,282,9.3,deep,900,111);
      rr(x,288,108,26,13,'#ffffff',color||main,1);
      txt(money(value),x+54,305,12.1,color||deep,900,98,'center');
    }
    amount(22,'Total',d.total,main);
    amount(145,'Advance',d.advance,main);
    amount(268,'Collectable',d.due,Number(d.due)>0?'#c91854':main);
    // Advance in words (its own two-line band, not crowded into a single row).
    rr(22,321,353,34,3,'#e7f6f8',edge,.7);
    txt('Advance Paid in Words / কথায়',27,334,9.4,deep,900,335);
    var banglaWords=typeof options.numberToBanglaWords==='function'
      ?options.numberToBanglaWords(d.advance):money(d.advance)+' টাকা মাত্র';
    txt(banglaWords,27,349,10.8,dark,750,338);
    // Offline payment selector, no app/accounting logic changed.
    txt('Payment System',22,369,9.7,deep,900,129);
    if(d.trxId)txt('Trx: '+d.trxId,375,369,8,deep,750,180,'right');
    var methods=['Cash','Bkash','Nagad','Bank','Rocket'];
    var places=[22,89,168,248,316];
    methods.forEach(function(m,i){
      var x=places[i], checked=String(d.paymentMethod||'Cash').toLowerCase()===m.toLowerCase();
      c.strokeStyle=main;c.lineWidth=1;c.strokeRect(x,375,11,11);
      if(checked){ c.strokeStyle=deep;c.lineWidth=1.5;c.beginPath();
        c.moveTo(x+2,381);c.lineTo(x+5,384);c.lineTo(x+10,377);c.stroke(); }
      txt(m,x+14,385,8.8,checked?deep:ink,checked?900:720,50);
    });
    line(22,394,375,394,edge,1.05);
    // The original decorative barcode is removed: exactly one real offline QR.
    function drawQr() {
      if(d.showQr===false || typeof options.qrcode!=='function')return;
      try{
        var qr=options.qrcode(0,'M');
        qr.addData('INV:'+String(d.invoice||'')+'\nSEC:'+String(d.securityCode||'')+'\nAMT:'+String(Number(d.total)||0),'Byte');
        qr.make();
        var n=qr.getModuleCount(),quiet=4,box=69,step=box/(n+quiet*2);
        rr(22,400,79,78,5,'#ffffff','#cbdee3',.7);
        c.fillStyle='#092f3c';
        for(var y=0;y<n;y++)for(var x=0;x<n;x++)if(qr.isDark(y,x))
          c.fillRect(27+(x+quiet)*step,404+(y+quiet)*step,step+.008,step+.008);
      }catch(err){if(window.console)console.warn('Receipt QR unavailable:',err);}
    }
    drawQr();
    txt('SECURITY CODE',109,412,8,deep,900,154);
    txt(d.securityCode||'—',109,428,9.3,dark,820,157);
    txt('VERIFIED TRAVEL PASS',109,445,8.6,'#506b78',900,160);
    var issuerLines=wrapTwo('Issued By: '+String(d.salesman||'—'),161,9.4,900);
    txt(issuerLines[0],109,458,9.4,deep,900,161);
    if(issuerLines[1])txt(issuerLines[1],109,471,9.4,deep,900,161);
    // Official stamp in the signature area, with user's actual signature above it.
    if(d.showStamp!==false) {
      c.save();c.translate(326,438);c.rotate(-.075);c.globalAlpha=.13;
      rr(-49,-24,98,48,3,null,main,1.5);
      txt((s.companyEn||'TRAVEL AGENCY').toUpperCase(),0,-11,6.2,main,900,91,'center');
      rr(-32,-6,64,15,2,null,main,.8);
      txt(Number(d.due)>0?'BOOKED • DUE':'FULLY PAID',0,5,6.5,deep,900,61,'center');
      txt('OFFICIAL SEAL',0,18,6.4,deep,900,89,'center');
      c.restore();
    }
    line(278,458,375,458,'#55939b',.85);
    txt(s.signatoryLabel||'Authorized Signature',375,472,7.8,deep,820,105,'right');
    // Slim authenticity strip and restrained premium footer.
    rect(12,481,368,6,'#e5f5f7');
    txt('ASHIK SHIKKHA POS • '+String(d.securityCode||'')+' • VERIFIED',16,485.5,5.3,deep,800,358);
    rect(12,487,368,13,main);
    txt(s.footerNotice||'Advance Money is not Refundable',196,497,9.5,'#ffffff',900,344,'center');
    c.restore();
    rr(2,2,w-4,h-4,8,null,main,1.1);
    // Draw saved logo and signature last; the seal cannot obscure handwriting.
    var pending=0,finished=false;
    function finish(){if(pending===0&&!finished){finished=true;callback(canvas,d);}}
    function imageAsset(url,x,y,iw,ih){
      if(!url)return;
      pending++;var im=new Image();
      im.onload=function(){try{c.save();c.drawImage(im,x,y,iw,ih);c.restore();}catch(e){}pending--;finish();};
      im.onerror=function(){pending--;finish();};
      im.src=url;
    }
    imageAsset(s.logoDataUrl,25,40,28,28);
    imageAsset(options.signatureDataUrl,283,413,86,38);
    finish();
  }
  window.ShikkhaReceiptTicket={render:renderTicket};
})();