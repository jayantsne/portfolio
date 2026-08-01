import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
export interface ReminderSettings { enabled:boolean; localTime:string; timeZoneId:string; devices:number; supported:boolean; }
@Injectable({ providedIn:'root' })
export class DailyReminderService {
  private url=`${environment.apiUrl}/reminders`; constructor(private http:HttpClient){}
  settings():Observable<ReminderSettings>{return this.http.get<ReminderSettings>(`${this.url}/settings`,{withCredentials:true});}
  enable(localTime:string):Observable<unknown>{
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)) return throwError(()=>new Error('Push notifications are not supported on this browser.'));
    return from(Notification.requestPermission()).pipe(switchMap(permission=>permission==='granted'?this.http.get<{publicKey:string}>(`${this.url}/vapid-public-key`,{withCredentials:true}):throwError(()=>new Error('Allow notifications to receive your daily note.'))),switchMap(key=>from(navigator.serviceWorker.ready).pipe(switchMap(reg=>from(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:this.toBytes(key.publicKey)}))))),switchMap(subscription=>{const json=subscription.toJSON();return this.http.post(`${this.url}/subscribe`,{endpoint:subscription.endpoint,keys:{p256dh:json.keys?.['p256dh'],auth:json.keys?.['auth']},localTime,timeZoneId:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'},{withCredentials:true});}));
  }
  update(enabled:boolean,localTime:string):Observable<unknown>{return this.http.put(`${this.url}/settings`,{enabled,localTime,timeZoneId:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'},{withCredentials:true});}
  test():Observable<unknown>{return this.http.post(`${this.url}/test`,{},{withCredentials:true});}
  private toBytes(value:string):Uint8Array{const padding='='.repeat((4-value.length%4)%4);const raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
}
