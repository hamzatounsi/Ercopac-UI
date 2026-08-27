import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead } from '../../models/crm-lead.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmUser } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
@Component({selector:'app-crm-account-detail-page',templateUrl:'./crm-account-detail-page.component.html',styleUrls:['./crm-account-detail-page.component.scss']})
export class CrmAccountDetailPageComponent implements OnInit{
 orgId=this.crm.getOrgIdFromToken();id=Number(this.route.snapshot.paramMap.get('id'));account?:CrmAccount;form?:CrmAccount;leads:CrmLead[]=[];opportunities:CrmOpportunity[]=[];users:CrmUser[]=[];loading=true;editing=false;saving=false;error='';
 constructor(private crm:CrmService,private route:ActivatedRoute,private router:Router,public permissions:CrmPermissionsService){}
 ngOnInit():void{this.load();this.crm.getCrmUsers(this.orgId).subscribe(v=>this.users=v);}
 load():void{this.loading=true;forkJoin({account:this.crm.getAccount(this.orgId,this.id),leads:this.crm.getLeads(this.orgId,undefined,undefined,this.id),opps:this.crm.getOpportunities(this.orgId,{accountId:this.id})}).subscribe({next:r=>{this.account=r.account;this.form={...r.account};this.leads=r.leads;this.opportunities=r.opps;this.loading=false;},error:e=>{this.error=e?.error?.message||'Account not found.';this.loading=false;}});}
 save():void{if(!this.form)return;this.saving=true;this.crm.updateAccount(this.orgId,this.id,this.form).subscribe({next:v=>{this.account=v;this.form={...v};this.editing=false;this.saving=false;},error:e=>{this.error=e?.error?.message||'Unable to save.';this.saving=false;}});}
 cancelEdit():void{if(this.account)this.form={...this.account};this.editing=false;}
 remove():void{if(!confirm('Delete this account?'))return;this.crm.deleteAccount(this.orgId,this.id).subscribe({next:()=>this.router.navigate(['/crm/accounts']),error:e=>this.error=e?.error?.message||'Unable to delete account.'});}
 money(v:number|null|undefined,c='EUR'):string{return v?new Intl.NumberFormat('en',{style:'currency',currency:c,maximumFractionDigits:0}).format(v):'—';}
 initials():string{return(this.account?.name||'?').split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase();}
}
