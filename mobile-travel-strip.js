/* Mobile-only Bangladesh travel animation; completely independent of receipts and accounting. */
(function(){
'use strict';
var root=document.getElementById('shikkhaTravelTourBar'),canvas=document.getElementById('groupTravelStoryCanvas'),title=document.getElementById('shikkhaTourTitle');
if(!root||!canvas||!title)return;
var c=canvas.getContext('2d');if(!c)return;
var scenes=[
['সুন্দরবন','বাঘ ও হরিণ','forest','🐅','🦌'],
['জাতীয় চিড়িয়াখানা','হাতি ও বানর','zoo','🐘','🐒'],
['বান্দরবান','পাহাড়ে অ্যাডভেঞ্চার','hills','🦋',''],
['সাজেক ভ্যালি','মেঘের রাজ্য','hills','🌿',''],
['রাতারগুল','জলাবনে নৌকা','river','🛶',''],
['সেন্ট মার্টিন','নারকেলগাছ ও সমুদ্র','beach','🐢',''],
['কক্সবাজার','সৈকতে ঘোরাঘুরি','beach','🦀',''],
['শ্রীমঙ্গল','সবুজ চা বাগান','tea','🦋',''],
['জাফলং','নদী ও পাথর','river','🐟',''],
['টাঙ্গুয়ার হাওর','হাওর আর নৌকা','river','🦆',''],
['রাঙামাটি','কাপ্তাই লেক','hills','🛶',''],
['কুয়াকাটা','সূর্যোদয় ও সূর্যাস্ত','beach','🦀',''],
['নীলগিরি','পাহাড়ের মেঘ','hills','🌿',''],
['লালবাগ কেল্লা','ঐতিহাসিক ভ্রমণ','heritage','🕊️','']
],rides=['বাস','রিকশা','CNG','জিপ','মাইক্রোবাস','নৌকা'],shirts=['#e11d48','#0891b2','#2563eb','#16a34a','#d97706','#7c3aed','#db2777','#f97316'];
var w=350,h=112,scale=1,scene=null,prev=-1,t=0,duration=16,lastTime=0,people=[],ride=null,raf=0,reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function rand(a,b){return a+Math.random()*(b-a);}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function mobile(){return (window.innerWidth||390)<768;}
function disk(x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function tree(x,y,s,palm){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#845d3c';c.fillRect(-3,-34,6,39);c.fillStyle='#15803d';if(palm){for(var k=0;k<5;k++){var a=k*1.257;c.beginPath();c.ellipse(Math.cos(a)*12,-33+Math.sin(a)*8,18,5,a,0,7);c.fill();}}else{for(var i=0;i<4;i++)disk(-12+i*8,-36-(i%2)*7,14,i%2?'#166534':'#15803d');}c.restore();}
function cloud(x,y){c.save();c.globalAlpha=.78;disk(x-11,y,9,'#fff');disk(x+2,y-5,13,'#fff');disk(x+17,y,9,'#fff');c.restore();}
function switchScene(){
var idx=Math.floor(rand(0,scenes.length-1));if(idx>=prev)idx++;prev=idx;scene=scenes[idx];t=0;duration=rand(12,19);
title.textContent='✈️ '+scene[0]+' • '+scene[1];
people=[];var n=Math.floor(rand(3,10));
for(var i=0;i<n;i++)people.push({x:rand(23,w-23),direction:i%2?1:-1,speed:rand(6,22),shirt:pick(shirts),hat:pick(['#facc15','#fb923c','#7dd3fc','#f5d0fe']),task:pick(['walk','walk','wave','photo','rest']),phase:rand(0,6.28),size:rand(.86,1.2),offset:rand(-3,3)});
ride={type:pick(rides),x:-90,speed:rand(25,56)};
}
function resize(){
if(!mobile())return;
var b=root.getBoundingClientRect();
w=Math.max(240,Math.round(b.width||350));h=Math.max(50,Math.round(b.height||112));scale=Math.min(2,window.devicePixelRatio||1);
canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);c.setTransform(scale,0,0,scale,0,0);draw(0);
}
function background(){
var kind=scene[2],sea=kind==='river'||kind==='beach',hill=kind==='hills';
var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,sea?'#84d9f9':'#bce8f9');g.addColorStop(1,'#ddf8e8');c.fillStyle=g;c.fillRect(0,0,w,h);
disk(w-22,17,10,'#fcd34d');cloud(w*.27+Math.sin(t*.4)*5,18);
if(hill){c.fillStyle='#83ba9c';c.beginPath();c.moveTo(-20,h*.84);c.lineTo(w*.17,h*.2);c.lineTo(w*.46,h*.84);c.fill();c.fillStyle='#57967b';c.beginPath();c.moveTo(w*.27,h*.85);c.lineTo(w*.57,h*.13);c.lineTo(w*.88,h*.85);c.fill();cloud(w*.56,h*.36);}
if(sea){c.fillStyle='#4ab2d4';c.fillRect(0,h*.68,w,h*.32);c.strokeStyle='#d6fbff';c.lineWidth=2;for(var a=0;a<5;a++){var x=a*74+Math.sin(t+a)*8,y=h*.79+a%2*9;c.beginPath();c.moveTo(x,y);c.lineTo(x+24,y);c.stroke();}if(kind==='beach'){c.fillStyle='#eed799';c.beginPath();c.moveTo(0,h*.85);c.quadraticCurveTo(w*.5,h*.62,w,h*.91);c.lineTo(w,h);c.lineTo(0,h);c.fill();}}
else{c.fillStyle=kind==='forest'?'#81b78a':'#a5d7a0';c.fillRect(0,h*.82,w,h*.18);}
if(kind==='forest'||kind==='tea'||kind==='river'){tree(24,h*.79,1.05);tree(w*.3,h*.78,.8);tree(w*.76,h*.80,.95);tree(w-20,h*.8,.87);}
if(kind==='beach'){tree(27,h*.82,1.12,true);tree(w-32,h*.83,.94,true);}
if(kind==='zoo'){tree(w-20,h*.82,.9);c.strokeStyle='#7c8794';c.lineWidth=1.5;for(var z=0;z<7;z++){var xx=w*.15+z*w*.1;c.beginPath();c.moveTo(xx,h*.40);c.lineTo(xx,h*.82);c.stroke();}c.beginPath();c.moveTo(w*.15,h*.45);c.lineTo(w*.8,h*.45);c.stroke();}
if(kind==='tea'){c.strokeStyle='#238b57';c.lineWidth=5;for(var q=0;q<3;q++){c.beginPath();c.moveTo(0,h*.62+q*11);c.quadraticCurveTo(w*.5,h*.81+q*6,w,h*.61+q*11);c.stroke();}}
if(kind==='heritage'){c.fillStyle='#af6650';c.fillRect(w*.36,h*.38,w*.37,h*.46);c.fillStyle='#7d4739';c.fillRect(w*.49,h*.57,w*.11,h*.27);for(var k=0;k<4;k++)c.fillRect(w*.37+k*w*.095,h*.31,w*.055,h*.12);}
if(hill){tree(w-25,h*.84,.9);c.fillStyle='#b45309';c.fillRect(w*.18,h*.62,33,18);c.fillStyle='#0f766e';c.beginPath();c.moveTo(w*.16,h*.62);c.lineTo(w*.18+17,h*.46);c.lineTo(w*.18+39,h*.62);c.fill();}
if(scene[3]){c.font=(h<80?'19':'28')+'px "Segoe UI Emoji",system-ui,sans-serif';c.textAlign='center';c.fillText(scene[3],w*.76,h*.74);if(scene[4]){c.font=(h<80?'15':'23')+'px "Segoe UI Emoji",system-ui,sans-serif';c.fillText(scene[4],w*.65,h*.76);}}
}
function person(p,dt){
if(dt&&p.task!=='rest'){p.x+=p.speed*p.direction*dt;if(p.x<20)p.direction=1;if(p.x>w-19)p.direction=-1;p.phase+=dt*9;}
var y=h*.84+p.offset,k=p.size*(h<80?.74:1),sw=Math.sin(p.phase)*4;
c.save();c.translate(p.x,y);c.scale(k,k);c.strokeStyle='#334155';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(-3,-9);c.lineTo(-3+(p.task==='walk'?sw:0),0);c.moveTo(3,-9);c.lineTo(3-(p.task==='walk'?sw:0),0);c.stroke();
c.fillStyle=p.shirt;c.fillRect(-6,-24,12,16);c.strokeStyle='#f4be95';c.lineWidth=2.5;c.beginPath();c.moveTo(-6,-21);c.lineTo(-9,-14);c.moveTo(6,-21);c.lineTo(9,p.task==='wave'?-30:p.task==='photo'?-26:-14);c.stroke();
disk(0,-29,5.7,'#f4be95');c.fillStyle=p.hat;c.fillRect(-6,-35,12,3);c.fillRect(-4,-40,8,6);
if(p.task==='photo'){c.fillStyle='#2b4357';c.fillRect(7,-28,7,5);}c.restore();
}
function vehicle(dt){
if(dt)ride.x+=ride.speed*dt;if(ride.x>w+100){ride.x=-85;ride.type=pick(rides);}
var x=ride.x,y=h*.90,type=ride.type;
c.save();c.translate(x,y);c.scale(h<80?.8:1,h<80?.8:1);
if(type==='নৌকা'){c.fillStyle='#92400e';c.beginPath();c.moveTo(-30,-12);c.lineTo(31,-12);c.lineTo(20,0);c.lineTo(-20,0);c.fill();c.strokeStyle='#166534';c.lineWidth=2;c.beginPath();c.moveTo(0,-12);c.lineTo(0,-39);c.stroke();c.fillStyle='#fff3a4';c.beginPath();c.moveTo(2,-37);c.lineTo(2,-12);c.lineTo(22,-12);c.fill();}
else{
var wd=type==='বাস'?80:type==='রিকশা'?46:type==='CNG'?51:69,ht=type==='বাস'?30:type==='রিকশা'?16:25;
c.fillStyle=type==='রিকশা'?'#21a66d':type==='CNG'?'#16966f':type==='জিপ'?'#c69235':'#1587b1';c.fillRect(-wd/2,-ht-5,wd,ht);
if(type==='রিকশা'){c.fillStyle='#fde68a';c.beginPath();c.moveTo(-24,-20);c.lineTo(-11,-37);c.lineTo(11,-37);c.lineTo(24,-20);c.fill();}
else{c.fillStyle='#d1f5fc';for(var i=0;i<(type==='বাস'?4:2);i++)c.fillRect(-wd/2+8+i*(type==='বাস'?18:22),-ht,14,10);}
disk(-wd*.32,-4,5,'#142238');disk(wd*.32,-4,5,'#142238');
}
c.restore();
}
function draw(dt){
if(!mobile())return;
background();
for(var i=0;i<people.length;i++)person(people[i],dt);
vehicle(dt);
}
function animate(now){
if(!mobile()){raf=0;return;}
var dt=lastTime?Math.min(.085,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
if(!document.hidden){t+=dt;if(t>duration)switchScene();draw(dt);}
raf=window.requestAnimationFrame(animate);
}
function onResize(){if(mobile()){resize();if(!reduce&&!raf&&window.requestAnimationFrame){lastTime=0;raf=window.requestAnimationFrame(animate);}}}
switchScene();resize();window.addEventListener('resize',onResize);
if(window.ResizeObserver)new ResizeObserver(onResize).observe(root);
document.addEventListener('visibilitychange',function(){lastTime=0;});
if(!reduce&&window.requestAnimationFrame)raf=window.requestAnimationFrame(animate);
root.dataset.loaded='true';
})();