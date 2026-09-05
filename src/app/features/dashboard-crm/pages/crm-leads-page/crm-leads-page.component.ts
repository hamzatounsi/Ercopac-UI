import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead, CrmLeadStatus, emptyLead, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from '../../models/crm-lead.model';
import { CrmUser } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
@Component({selector:'app-crm-leads-page',templateUrl:'./crm-leads-page.component.html',styleUrls:['./crm-leads-page.component.scss']})
export class CrmLeadsPageComponent implements OnInit{
 orgId=this.crm.getOrgIdFromToken();leads:CrmLead[]=[];accounts:CrmAccount[]=[];users:CrmUser[]=[];loading=true;search='';filter='ALL';showForm=false;saving=false;form=emptyLead();error='';sources=Object.entries(LEAD_SOURCE_LABELS);statusLabels=LEAD_STATUS_LABELS;statusOptions=Object.entries(LEAD_STATUS_LABELS).filter(([value])=>value!=='CONVERTED').map(([value,item])=>({value:value as CrmLeadStatus,label:item.label}));
 constructor(private crm:CrmService,private router:Router,public permissions:CrmPermissionsService){}
 ngOnInit():void{forkJoin({accounts:this.crm.getAccounts(this.orgId),users:this.crm.getCrmUsers(this.orgId)}).subscribe(v=>{this.accounts=v.accounts;this.users=v.users;});this.load();}
 load():void{this.loading=true;this.crm.getLeads(this.orgId,this.search,this.filter==='ALL'?undefined:this.filter).subscribe({next:v=>{this.leads=v;this.loading=false;},error:e=>{this.error=e?.error?.message||'Unable to load leads.';this.loading=false;}});}
 setFilter(v:string):void{this.filter=v;this.load();} openNew():void{this.form=emptyLead();this.showForm=true;this.error='';}
 save():void{if(!this.form.fullName.trim()||!this.form.accountId){this.error='Name and Account are required.';return;}this.saving=true;this.crm.createLead(this.orgId,this.form).subscribe({next:v=>{this.saving=false;this.showForm=false;this.router.navigate(['/crm/leads',v.id]);},error:e=>{this.error=e?.error?.message||'Unable to save lead.';this.saving=false;}});}
 update(lead:CrmLead):void{this.error='';this.crm.updateLead(this.orgId,lead.id!,lead).subscribe({next:value=>Object.assign(lead,value),error:e=>{this.error=e?.error?.message||'Unable to update lead.';this.load();}});}
 delete(event:Event,lead:CrmLead):void{event.stopPropagation();if(!window.confirm(`Delete ${lead.fullName}?`))return;this.crm.deleteLead(this.orgId,lead.id!).subscribe({next:()=>this.leads=this.leads.filter(item=>item.id!==lead.id),error:e=>this.error=e?.error?.message||'Unable to delete lead.'});}
 open(v:CrmLead):void{this.router.navigate(['/crm/leads',v.id]);} statusClass(v:CrmLeadStatus):string{return v==='CONVERTED'?'success':v==='CONTACTED'?'info':v==='CONTACT_IN_FUTURE'?'warning':'';}
}
