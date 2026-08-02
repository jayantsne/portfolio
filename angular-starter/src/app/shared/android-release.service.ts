import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
export interface AndroidRelease {id:string;versionName:string;versionCode:number;releaseNotes:string;fileSize:number;sha256:string;isActive:boolean;isPublished:boolean;minimumSupportedVersionCode:number;uploadedAt:string;publishedAt?:string;downloadCount:number;}
@Injectable({providedIn:'root'})
export class AndroidReleaseService{
  private url=`${environment.apiUrl}/admin/android-releases`;constructor(private http:HttpClient){}
  getActiveRelease():Observable<AndroidRelease>{return this.http.get<AndroidRelease>(`${this.url}/active`,{withCredentials:true});}
  getReleases():Observable<AndroidRelease[]>{return this.http.get<AndroidRelease[]>(this.url,{withCredentials:true});}
  uploadRelease(data:FormData):Observable<HttpEvent<AndroidRelease>>{return this.http.post<AndroidRelease>(this.url,data,{withCredentials:true,observe:'events',reportProgress:true});}
  publishRelease(id:string):Observable<void>{return this.http.post<void>(`${this.url}/${id}/publish`,{},{withCredentials:true});}
  unpublishRelease(id:string):Observable<void>{return this.http.post<void>(`${this.url}/${id}/unpublish`,{},{withCredentials:true});}
  deleteRelease(id:string):Observable<void>{return this.http.delete<void>(`${this.url}/${id}`,{withCredentials:true});}
  download(id:string):Observable<Blob>{return this.http.get(`${this.url}/${id}/download`,{withCredentials:true,responseType:'blob'});}
  saveBlob(release:AndroidRelease,blob:Blob):void{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`LearnWithAI-${release.versionName}.apk`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
