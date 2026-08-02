import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { PlatformService } from './platform.service';
@Injectable({providedIn:'root'})
export class AndroidBackButtonService {
  constructor(private router:Router,private platform:PlatformService){}
  init():void{
    if(!this.platform.isAndroid()||!this.platform.isNative())return;
    App.addListener('backButton',async({canGoBack})=>{
      const closable=document.querySelector<HTMLElement>('[aria-modal="true"],.drawer.open,.modal.show');
      if(closable){closable.dispatchEvent(new CustomEvent('capacitorBack',{bubbles:true}));return;}
      if(this.router.url.includes('interview-battle')&&!confirm('End the active interview and leave this screen?'))return;
      if(document.body.dataset['unsavedChanges']==='true'&&!confirm('Discard your unsaved changes?'))return;
      if(canGoBack){history.back();return;}
      await App.minimizeApp();
    });
  }
}
