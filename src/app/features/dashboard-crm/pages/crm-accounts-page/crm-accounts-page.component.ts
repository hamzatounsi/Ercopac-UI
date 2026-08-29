import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CrmAccount, emptyAccount } from '../../models/crm-account.model';
import { CrmIndustry, CrmUser } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
import { CrmCountryService } from '../../services/crm-country.service';

@Component({ selector:'app-crm-accounts-page', templateUrl:'./crm-accounts-page.component.html', styleUrls:['./crm-accounts-page.component.scss'] })
export class CrmAccountsPageComponent implements OnInit {
  orgId=this.crm.getOrgIdFromToken(); accounts:CrmAccount[]=[]; users:CrmUser[]=[]; industries:CrmIndustry[]=[]; search=''; view:'grid'|'list'='grid'; loading=true;
  showForm=false; saving=false; form=emptyAccount(); error='';
  constructor(private crm:CrmService, private router:Router, public permissions:CrmPermissionsService, public countries:CrmCountryService){}
  ngOnInit():void{this.load();this.crm.getCrmUsers(this.orgId).subscribe(v=>this.users=v);this.crm.getIndustries(this.orgId).subscribe(v=>this.industries=v);}
  load():void{this.loading=true;this.crm.getAccounts(this.orgId,this.search).subscribe({next:v=>{this.accounts=v;this.loading=false;},error:e=>{this.error=this.message(e);this.loading=false;}});}
  openNew():void{this.form=emptyAccount();this.error='';this.showForm=true;}
  save():void{if(!this.form.name.trim()){this.error='Company name is required.';return;}this.saving=true;this.crm.createAccount(this.orgId,this.form).subscribe({next:v=>{this.saving=false;this.showForm=false;this.router.navigate(['/crm/accounts',v.id]);},error:e=>{this.error=this.message(e);this.saving=false;}});}
  open(account:CrmAccount):void{this.router.navigate(['/crm/accounts',account.id]);}
  initials(name:string):string{return name.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase();}
  money(value:number|null|undefined,currency='EUR'):string{return value?new Intl.NumberFormat('en',{style:'currency',currency,maximumFractionDigits:0}).format(value):'—';}
  private message(error:any):string{return error?.error?.message||'Unable to complete the request.';}
}
