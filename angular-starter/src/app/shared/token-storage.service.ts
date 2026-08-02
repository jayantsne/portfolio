import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
@Injectable({providedIn:'root'})
export class TokenStorageService{
  private cached:string|null=null;private readonly key='learnwithai_access_token';
  async init():Promise<void>{if(!Capacitor.isNativePlatform())return;try{this.cached=await SecureStorage.getItem(this.key);}catch{this.cached=null;}}
  get():string|null{return Capacitor.isNativePlatform()?this.cached:null;}
  async set(token:string):Promise<void>{if(!Capacitor.isNativePlatform()||!token)return;this.cached=token;await SecureStorage.setItem(this.key,token);}
  async clear():Promise<void>{this.cached=null;if(Capacitor.isNativePlatform())await SecureStorage.removeItem(this.key).catch(()=>undefined);}
}
