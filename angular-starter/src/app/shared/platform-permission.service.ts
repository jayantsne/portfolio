import { Injectable } from '@angular/core';
@Injectable({providedIn:'root'})
export class PlatformPermissionService {
  async requestMicrophoneAtPointOfUse():Promise<boolean>{
    if(!navigator.mediaDevices?.getUserMedia)return false;
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop());return true;}catch{return false;}
  }
  async notificationPermission():Promise<NotificationPermission>{
    if(!('Notification'in window))return'denied';
    return Notification.permission==='default'?Notification.requestPermission():Notification.permission;
  }
}
