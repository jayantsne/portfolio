import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
@Injectable({providedIn:'root'})
export class PlatformService {
  isNative():boolean{return Capacitor.isNativePlatform();}
  isAndroid():boolean{return Capacitor.getPlatform()==='android';}
  isWeb():boolean{return Capacitor.getPlatform()==='web';}
  isMobileViewport():boolean{return matchMedia('(max-width: 767px)').matches;}
  isMobileWeb():boolean{return this.isWeb()&&this.isMobileViewport();}
}
