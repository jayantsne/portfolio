import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PlatformService } from './platform.service';
@Injectable({providedIn:'root'})
export class NativeRecallNotificationService{
  constructor(private platform:PlatformService,private router:Router){}
  async init():Promise<void>{if(!this.platform.isNative())return;await LocalNotifications.addListener('localNotificationActionPerformed',()=>this.router.navigate(['/revision']));}
  async scheduleDaily(hour:number,minute:number):Promise<boolean>{if(!this.platform.isNative())return false;const permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted')return false;await LocalNotifications.cancel({notifications:[{id:8101}]});await LocalNotifications.schedule({notifications:[{id:8101,title:'Time for a quick recall',body:'Your interview concepts are ready for a short review.',schedule:{on:{hour,minute},repeats:true,allowWhileIdle:true},extra:{route:'/notes-recall'}}]});return true;}
  async cancel():Promise<void>{if(this.platform.isNative())await LocalNotifications.cancel({notifications:[{id:8101}]});}
  async sendTest():Promise<boolean>{if(!this.platform.isNative())return false;const permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted')return false;await LocalNotifications.schedule({notifications:[{id:8102,title:'Quick recall is ready',body:'Open LearnWithAI and revise one saved note now.',schedule:{at:new Date(Date.now()+1000)},extra:{route:'/revision'}}]});return true;}
}
