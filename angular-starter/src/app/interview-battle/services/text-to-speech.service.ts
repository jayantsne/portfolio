import { Injectable } from '@angular/core';
@Injectable({providedIn:'root'}) export class TextToSpeechService { speak(text:string,rate=1){this.stop();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=Math.min(2,Math.max(.5,rate));speechSynthesis.speak(u);} pause(){speechSynthesis.pause();} resume(){speechSynthesis.resume();} stop(){speechSynthesis.cancel();} }
