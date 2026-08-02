import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PlatformService } from './platform.service';
import { NativeRecallNotificationService } from './native-recall-notification.service';
export interface ReminderSettings { enabled:boolean; localTime:string; timeZoneId:string; devices:number; supported:boolean; }
@Injectable({ providedIn:'root' })
export class DailyReminderService {
  private url=`${environment.apiUrl}/reminders`; constructor(private http:HttpClient,private platform:PlatformService,private nativeNotifications:NativeRecallNotificationService){}
  settings():Observable<ReminderSettings>{return this.http.get<ReminderSettings>(`${this.url}/settings`,{withCredentials:true});}
  enable(localTime:string):Observable<unknown>{
    if(!this.platform.isNative()) return throwError(()=>new Error('Daily reminders are available in the LearnWithAI Android app.'));
    const [hour,minute]=localTime.split(':').map(Number);
    return from(this.nativeNotifications.scheduleDaily(hour||8,minute||0)).pipe(switchMap(granted=>granted?this.update(true,localTime):throwError(()=>new Error('Allow notifications to receive your daily note.'))));
  }
  update(enabled:boolean,localTime:string):Observable<unknown>{
    if(!this.platform.isNative()) return throwError(()=>new Error('Daily reminders are available in the LearnWithAI Android app.'));
    const [hour,minute]=localTime.split(':').map(Number);
    const notification=enabled?this.nativeNotifications.scheduleDaily(hour||8,minute||0):this.nativeNotifications.cancel().then(()=>true);
    return from(notification).pipe(switchMap(()=>this.http.put(`${this.url}/settings`,{enabled,localTime,timeZoneId:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'},{withCredentials:true})));
  }
  test():Observable<unknown>{return this.platform.isNative()?from(this.nativeNotifications.sendTest()):throwError(()=>new Error('Test notifications are available in the Android app.'));}
}
