import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CrmLang = 'fr' | 'it' | 'en';

const STORAGE_KEY = 'crm-lang';

// Traductions pour les valeurs dynamiques (noms d'étapes, sources, etc.)
const DYNAMIC_TRANSLATIONS: Record<string, Record<CrmLang, string>> = {
  // Pipeline stage names
  'Make presentation': { en: 'Make presentation', fr: 'Faire une présentation', it: 'Fare una presentazione' },
  'Problem setting': { en: 'Problem setting', fr: 'Définition du problème', it: 'Definizione del problema' },
  'Problem solving': { en: 'Problem solving', fr: 'Résolution de problème', it: 'Risoluzione del problema' },
  'Proposal/Quote': { en: 'Proposal/Quote', fr: 'Proposition/Devis', it: 'Proposta/Preventivo' },
  'Negotiation/Revision': { en: 'Negotiation/Revision', fr: 'Négociation/Révision', it: 'Negoziazione/Revisione' },
  'Closed won': { en: 'Closed won', fr: 'Gagné', it: 'Vinto' },
  'Closed lost': { en: 'Closed lost', fr: 'Perdu', it: 'Perso' },
  'Abandoned': { en: 'Abandoned', fr: 'Abandonné', it: 'Abbandonato' },
  'Qualification': { en: 'Qualification', fr: 'Qualification', it: 'Qualifica' },
  'Discovery': { en: 'Discovery', fr: 'Découverte', it: 'Scoperta' },
  'Needs Analysis': { en: 'Needs Analysis', fr: 'Analyse des besoins', it: 'Analisi dei bisogni' },
  'Value Proposition': { en: 'Value Proposition', fr: 'Proposition de valeur', it: 'Proposta di valore' },
  'Identify Decision Makers': { en: 'Identify Decision Makers', fr: 'Identifier les décideurs', it: 'Identificare i decisori' },
  'Perception Analysis': { en: 'Perception Analysis', fr: 'Analyse de perception', it: 'Analisi della percezione' },
  'Proposal/Price Quote': { en: 'Proposal/Price Quote', fr: 'Proposition/Devis de prix', it: 'Proposta/Preventivo di prezzo' },
  'Negotiation/Review': { en: 'Negotiation/Review', fr: 'Négociation/Révision', it: 'Negoziazione/Revisione' },
  'Closed Won': { en: 'Closed Won', fr: 'Gagné', it: 'Vinto' },
  'Closed Lost': { en: 'Closed Lost', fr: 'Perdu', it: 'Perso' },
  'Prospecting': { en: 'Prospecting', fr: 'Prospection', it: 'Prospezione' },
  'Contact Made': { en: 'Contact Made', fr: 'Contact établi', it: 'Contatto stabilito' },
  'Meeting Scheduled': { en: 'Meeting Scheduled', fr: 'Réunion planifiée', it: 'Riunione programmata' },
  
  // Lead source names
  'REFERRAL': { en: 'Referral', fr: 'Recommandation', it: 'Referral' },
  'TRADE_FAIR': { en: 'Trade fair', fr: 'Salon professionnel', it: 'Fiera' },
  'AGENT': { en: 'Agent', fr: 'Agent', it: 'Agente' },
  'CUSTOMER': { en: 'Customer', fr: 'Client', it: 'Cliente' },
  'PARTNER': { en: 'Partner', fr: 'Partenaire', it: 'Partner' },
  'OTHER': { en: 'Other', fr: 'Autre', it: 'Altro' },
  'WEBSITE': { en: 'Website', fr: 'Site web', it: 'Sito web' },
  'SOCIAL_MEDIA': { en: 'Social media', fr: 'Réseaux sociaux', it: 'Social media' },
  'EMAIL': { en: 'Email', fr: 'E-mail', it: 'E-mail' },
  'COLD_CALL': { en: 'Cold call', fr: 'Appel à froid', it: 'Chiamata a freddo' },
  'INBOUND': { en: 'Inbound', fr: 'Entrant', it: 'Inbound' },
  'OUTBOUND': { en: 'Outbound', fr: 'Sortant', it: 'Outbound' },
  
  // Lead status names
  'NOT_CONTACTED': { en: 'Not contacted', fr: 'Non contacté', it: 'Non contattato' },
  'CONTACTED': { en: 'Contacted', fr: 'Contacté', it: 'Contattato' },
  'CONVERTED': { en: 'Converted', fr: 'Converti', it: 'Convertito' },
  'CONTACT_IN_FUTURE': { en: 'Contact in future', fr: 'Contacter plus tard', it: 'Contattare in futuro' },
  
  // Opportunity types
  'BP': { en: 'BP', fr: 'BP', it: 'BP' },
  'CS': { en: 'CS', fr: 'CS', it: 'CS' },
  
  // Pipeline types
  'MTO': { en: 'MTO', fr: 'MTO', it: 'MTO' },
  'ETO': { en: 'ETO', fr: 'ETO', it: 'ETO' },
  
  // Common words
  'Unassigned': { en: 'Unassigned', fr: 'Non attribué', it: 'Non assegnato' },
  'System': { en: 'System', fr: 'Système', it: 'Sistema' },
  'Owner': { en: 'Owner', fr: 'Propriétaire', it: 'Proprietario' },
  'Industry not specified': { en: 'Industry not specified', fr: 'Secteur non spécifié', it: 'Settore non specificato' },
  'Country not specified': { en: 'Country not specified', fr: 'Pays non spécifié', it: 'Paese non specificato' },
  'Account': { en: 'Account', fr: 'Compte', it: 'Account' },
  'Contact': { en: 'Contact', fr: 'Contact', it: 'Contatto' },
  'Hot': { en: 'Hot', fr: 'Chaud', it: 'Caldo' },
  'Warm': { en: 'Warm', fr: 'Tiède', it: 'Tiepido' },
  'Cold': { en: 'Cold', fr: 'Froid', it: 'Freddo' },
  'No rating': { en: 'No rating', fr: 'Aucune évaluation', it: 'Nessuna valutazione' },
  'Referral': { en: 'Referral', fr: 'Recommandation', it: 'Referral' },
  'Trade fair': { en: 'Trade fair', fr: 'Salon professionnel', it: 'Fiera' },
  'Agent': { en: 'Agent', fr: 'Agent', it: 'Agente' },
  'Customer': { en: 'Customer', fr: 'Client', it: 'Cliente' },
  'Partner': { en: 'Partner', fr: 'Partenaire', it: 'Partner' },
  'Other': { en: 'Other', fr: 'Autre', it: 'Altro' }
};

const DICTIONARIES: Record<CrmLang, Record<string, any>> = {
  en: {
    'header.search.placeholder': 'Search records...',
    'header.workspaces': 'Workspaces',
    'nav.main': 'Main',
    'nav.dashboard': 'Dashboard',
    'nav.accounts': 'Accounts',
    'nav.leads': 'Leads',
    'nav.opportunities': 'Opportunities',
    'nav.managerView': 'Manager view',
    'nav.insights': 'Insights',
    'nav.reports': 'Reports',
    'nav.analytics': 'Analytics',
    'nav.configuration': 'Configuration',
    'nav.settings': 'Settings',
    'search.searching': 'Searching records...',
    'search.noResults': 'No matching CRM records.',
    'search.account': 'Account',
    'search.lead': 'Lead',
    'search.opportunity': 'Opportunity',
    'dashboard.welcomeBack': 'Welcome back',
    'dashboard.viewReports': 'View Reports',
    'dashboard.newOpportunity': 'New Opportunity',
    'dashboard.openOpportunities': 'Open Opportunities',
    'dashboard.currentlyOpen': 'Currently open',
    'dashboard.pipelineValue': 'Pipeline Value',
    'dashboard.dealsWord': 'deals',
    'dashboard.openPipelineLabel': 'open pipeline',
    'dashboard.activeLeads': 'Active Leads',
    'dashboard.inProgress': 'In progress',
    'dashboard.noActiveLeads': 'No active leads',
    'dashboard.wonThisMonth': 'Won This Month',
    'dashboard.closedThisMonth': 'Closed this month',
    'dashboard.opportunityPipeline': 'Opportunity Pipeline',
    'dashboard.viewAll': 'View All',
    'dashboard.noDeals': 'No deals found.',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.noRecentActivity': 'No recent activity.',
    'dashboard.closingThisMonth': 'Closing This Month',
    'dashboard.col.opportunity': 'Opportunity',
    'dashboard.col.stage': 'Stage',
    'dashboard.col.value': 'Value',
    'dashboard.col.closing': 'Closing',
    'dashboard.col.owner': 'Owner',
    'dashboard.noClosingOpportunities': 'No closing opportunities.',
    'dashboard.leadsBySource': 'Leads by Source',
    'dashboard.leadsUnit': 'leads',
    'dashboard.noLeadsYet': 'No leads yet.',
    'dashboard.loading': 'Loading dashboard...',
    'modal.newOpportunity.title': 'New Opportunity',
    'modal.oppName': 'Opportunity Name',
    'modal.oppNamePlaceholder': 'Enter opportunity name',
    'modal.account': 'Account',
    'modal.selectAccount': 'Select an account',
    'modal.material': 'Material Value',
    'modal.services': 'Services Value',
    'modal.discount': 'Discount (%)',
    'modal.stage': 'Stage',
    'modal.closingDate': 'Closing Date',
    'modal.cancel': 'Cancel',
    'modal.creating': 'Creating...',
    'modal.createOpportunity': 'Create Opportunity',
    'leads': {
      'pageTitle': 'Leads',
      'totalLeads': 'total leads',
      'searchPlaceholder': 'Search contacts…',
      'createLead': 'Create lead',
      'filterAll': 'All leads',
      'filterConverted': 'Converted',
      'filterNotContacted': 'Not contacted',
      'filterContacted': 'Contacted',
      'loading': 'Loading leads…',
      'col': { 'name': 'Lead name', 'account': 'Account', 'jobTitle': 'Job title', 'email': 'Email', 'phone': 'Phone', 'source': 'Source', 'status': 'Status', 'owner': 'Owner' },
      'empty': 'No leads match the selected filters.',
      'modal': { 'title': 'Create lead', 'fullName': 'Full name *', 'account': 'Account *', 'selectAccount': 'Select account', 'jobTitle': 'Job title', 'email': 'Email', 'phone': 'Phone', 'mobile': 'Mobile', 'source': 'Source', 'owner': 'Owner', 'unassigned': 'Unassigned', 'notes': 'Notes & description', 'cancel': 'Cancel', 'creating': 'Creating…', 'create': 'Create lead' },
      'error': { 'required': 'Name and Account are required.', 'load': 'Unable to load leads.', 'save': 'Unable to save lead.', 'update': 'Unable to update lead.', 'delete': 'Unable to delete lead.' },
      'confirm': { 'delete': 'Delete {name}?' }
    },
    'leadDetail': {
      'backToLeads': 'Leads', 'convertToOpportunity': 'Convert to opportunity', 'delete': 'Delete', 'contactFallback': 'Contact', 'contactInfoTitle': 'Contact information', 'editableHint': 'all fields are editable', 'edit': 'Edit',
      'field': { 'fullName': 'Full name', 'email': 'Email', 'phone': 'Phone', 'mobile': 'Mobile', 'jobTitle': 'Job title', 'account': 'Account', 'owner': 'Owner', 'source': 'Source', 'rating': 'Rating', 'leadSource': 'Lead source', 'leadOwner': 'Lead owner', 'status': 'Status', 'created': 'Created', 'opportunities': 'Opportunities' },
      'unassigned': 'Unassigned',
      'source': { 'referral': 'Referral', 'tradeFair': 'Trade fair', 'agent': 'Agent', 'customer': 'Customer', 'partner': 'Partner', 'other': 'Other' },
      'rating': { 'none': 'No rating', 'hot': 'Hot', 'warm': 'Warm', 'cold': 'Cold' },
      'cancel': 'Cancel', 'save': 'Save', 'companyInfoTitle': 'Company information', 'industryNotSpecified': 'Industry not specified', 'countryNotSpecified': 'Country not specified', 'noAccountLinked': 'No account linked.', 'additionalInfoTitle': 'Additional information', 'notesTitle': 'Notes & description', 'noNotes': 'No notes recorded.', 'summaryTitle': 'Lead summary', 'activityTitle': 'Activity', 'log': 'Log', 'activityPlaceholder': 'Describe the activity…', 'logActivityBtn': 'Log activity', 'noActivity': 'No activity recorded.', 'relatedOppsTitle': 'Related opportunities', 'noRelatedOpps': 'No related opportunities.', 'loading': 'Loading lead…', 'confirmDelete': 'Delete this lead?',
      'error': { 'notFound': 'Lead not found.', 'save': 'Unable to save.', 'convert': 'Unable to convert.', 'delete': 'Unable to delete.', 'logActivity': 'Unable to log activity.' },
      'toast': { 'saved': 'Opportunity saved', 'equipmentSaved': 'Opportunity equipment saved', 'stageUpdated': 'Stage updated', 'teamAssigned': 'team member(s) assigned', 'notePosted': 'Note posted', 'fileAttached': 'File attached' }
    },
    'opportunities': {
      'pageTitle': 'Opportunities', 'pageSubtitle': 'Your pipeline', 'searchPlaceholder': 'Search opportunities…', 'newOpportunity': 'New opportunity', 'allStages': 'All stages', 'loading': 'Loading opportunities…', 'unassigned': 'Unassigned', 'empty': 'No opportunities match the selected filters.',
      'col': { 'name': 'Opportunity name', 'account': 'Account', 'stage': 'Stage', 'value': 'Value', 'probability': 'Probability', 'closingDate': 'Closing date', 'owner': 'Owner' },
      'modal': { 'title': 'New opportunity', 'name': 'Opportunity name *', 'account': 'Account *', 'selectAccount': 'Select account', 'contactPerson': 'Contact person', 'selectContact': 'Select contact', 'owner': 'Owner', 'unassigned': 'Unassigned', 'stage': 'Pipeline stage', 'probability': 'Probability (%)', 'discount': 'Discount (%)', 'supplyCategory': 'Supply category', 'selectCategory': 'Select category', 'materialValue': 'Material value', 'servicesValue': 'Services value', 'totalValue': 'Total value', 'ercopacSalesSplit': 'Ercopac sales split', 'thirdPartySalesSplit': 'Third-party sales split', 'totalSalesSplit': 'Total sales split', 'ercopacResaleSplit': 'Ercopac resale split', 'resaleSplit': 'Resale split', 'totalResaleSplit': 'Total resale split', 'closingDate': 'Closing date', 'opportunityType': 'Opportunity type', 'cancel': 'Cancel', 'creating': 'Creating…', 'create': 'Create opportunity' },
      'error': { 'loadFormData': 'Unable to load opportunity form data.', 'load': 'Unable to load opportunities.', 'required': 'Opportunity name and Account are required.', 'probability': 'Probability must be between 0 and 100.', 'discount': 'Discount must be between 0 and 100.', 'salesSplit': 'Sales split must equal Total Value.', 'resaleSplit': 'Resale split must equal Total Value.', 'create': 'Unable to create opportunity.' }
    },
    'opportunityDetail': {
      'backToOpportunities': 'Opportunities', 'readOnly': 'Read only', 'delete': 'Delete', 'unassigned': 'Unassigned', 'owner': 'Owner', 'pipeline': 'Pipeline', 'closing': 'Closing', 'relatedList': 'Related list', 'overview': 'Overview', 'value': 'Value', 'details': 'Details', 'equipment': 'Equipment', 'notes': 'Notes', 'attachments': 'Attachments', 'history': 'History', 'salesSummary': 'Sales summary', 'probability': 'Probability', 'cycleDuration': 'Cycle duration', 'opportunityName': 'Opportunity name', 'opportunityOwner': 'Opportunity owner', 'stage': 'Stage', 'discount': 'Discount', 'expectedRevenue': 'Expected revenue', 'quoteRequestedDate': 'Quote requested date', 'closingDate': 'Closing date', 'shipmentDate': 'Shipment date', 'account': 'Account', 'contactPerson': 'Contact person', 'selectContact': 'Select contact', 'valueInformation': 'Value information', 'costBreakdown': 'Cost breakdown', 'material': 'Material', 'services': 'Services', 'totalValue': 'Total value', 'salesSplit': 'Sales split', 'ercopac': 'Ercopac', 'tf': 'TF', 'resaleSplit': 'Resale split', 'resale': 'Resale', 'splitIs': 'Split is', 'opportunityDetails': 'Opportunity details', 'clickToEdit': 'Click any value to edit', 'readOnlyInfo': 'Read-only information', 'opportunityType': 'Opportunity type', 'supplyCategory': 'Supply category', 'selectCategory': 'Select category', 'probabilityPercent': 'Probability (%)', 'quoteNumber': 'Quote number', 'team': 'Team', 'noTeamMembers': 'No team members assigned', 'addMember': 'Add member…', 'quoteSubmitted': 'Quote submitted', 'nextStep': 'Next step', 'description': 'Description', 'addDescription': 'Add a description…', 'saving': 'Saving…', 'saveOpportunity': 'Save opportunity', 'opportunityEquipment': 'Opportunity equipment', 'addItem': 'Add item', 'qty': 'Qty', 'removeEquipment': 'Remove equipment', 'noEquipmentAdded': 'No equipment added yet.', 'quantity': 'Quantity', 'add': 'Add', 'cancel': 'Cancel', 'postNote': 'Post note', 'writeNote': 'Write a note…', 'noNotesPosted': 'No notes have been posted.', 'attachFile': 'Attach file', 'download': 'Download', 'noAttachments': 'No attachments.', 'modificationHistory': 'Modification history', 'system': 'System', 'changedFromTo': 'changed from', 'to': 'to', 'noModifications': 'No modifications recorded.', 'stageHistory': 'Stage history', 'modifiedBy': 'Modified by', 'entered': 'Entered', 'teamSelectResources': 'Team — select resources', 'teamSelectDesc': 'Select licensed team members assigned to this opportunity.', 'noActiveUsers': 'No active CRM users are available.', 'saveTeam': 'Save team', 'loadingWorkspace': 'Loading opportunity workspace…', 'confirmDelete': 'Delete this opportunity?',
      'error': { 'notFound': 'Opportunity not found.', 'save': 'Unable to save.', 'changeStage': 'Unable to change stage.', 'saveTeam': 'Unable to save the opportunity team.', 'postNote': 'Unable to post note.', 'upload': 'Unable to upload file.', 'delete': 'Unable to delete.', 'negativeValues': 'Opportunity values cannot be negative.', 'discountRange': 'Discount must be between 0 and 100%.', 'salesSplit': 'Sales split must equal Total Value.', 'resaleSplit': 'Resale split must equal Total Value.' }
    },
    'reports': {
      'pageTitle': 'Reports', 'pageSubtitle': 'All reports', 'loading': 'Loading reports...', 'opportunityReports': 'Opportunity reports', 'valueReports': 'Value reports', 'back': 'Reports', 'allTypes': 'All types', 'allStages': 'All stages', 'allTime': 'All time', 'thisMonth': 'This month', 'thisQuarter': 'This quarter', 'thisYear': 'This year', 'allMonths': 'All months', 'exportExcel': 'Excel', 'exportPdf': 'PDF', 'opportunities': 'Opportunities', 'pipelineValue': 'Pipeline value', 'expectedRevenue': 'Expected revenue', 'equipmentTypes': 'Equipment types', 'totalUnits': 'Total units', 'oppsWithEquipment': 'Opps with equipment', 'noEquipmentData': 'No equipment data for the selected filters. Add equipment to opportunities first.', 'paretoTitle': 'Pareto — equipment frequency', 'paretoSubtitle': 'Bars = units · Red line = cumulative %', 'distributionTitle': 'Distribution by equipment type', 'totalUnitsLabel': 'total units', 'equipmentPerOpp': 'Equipment per opportunity', 'account': 'Account', 'type': 'Type', 'stage': 'Stage', 'equipment': 'Equipment', 'totalUnitsCol': 'Total units', 'opportunitiesTracked': 'Opportunities tracked', 'totalUnitsToShip': 'Total units to ship', 'noShipmentData': 'No opportunities with both equipment and shipment date found.', 'equipmentUnitsByMonth': 'Equipment units by shipment month', 'shipmentSubtitle': 'Each line = one equipment type · Dots = actual shipments · Dashed = today', 'monthlyShipmentMatrix': 'Monthly shipment matrix', 'matrixSubtitle': 'Blue = current month · — = no shipment', 'monthlyTotal': 'Monthly total', 'shipmentDetail': 'Shipment detail', 'qty': 'Qty', 'shipmentDate': 'Shipment date', 'worldMapTitle': 'World map — opportunities by country', 'mapSubtitle': 'Bubble size = opportunity count', 'loadingMap': 'Loading geographical map...', 'noOppsMatchFilters': 'No opportunities match the selected filters.', 'distributionByCountry': 'Distribution by country', 'breakdownByCountry': 'Breakdown by country', 'opportunitiesLabel': 'opportunities', 'timelineTitle': 'Opportunities by opening and closing date', 'opened': 'Opened', 'closing': 'Closing', 'materialVsServices': 'Material vs Services', 'ercopacTfSplit': 'Ercopac / TF sales split', 'ercopacResaleSplit': 'Ercopac / Resale split', 'realOpportunityValues': 'Real opportunity values', 'total': 'Total', 'expectedRevenueByMonth': 'Expected revenue by month', 'expectedSubtitle': 'discounted value × probability', 'csProjectsOverview': 'CS projects overview', 'bpProjectsOverview': 'BP projects overview', 'monthlyOverview': 'Monthly overview', 'owner': 'Owner', 'value': 'Value', 'tfValue': 'TF value', 'probability': 'Probability', 'closingDate': 'Closing date',
      'error': { 'load': 'Unable to load reports.', 'loadEquipment': 'Unable to load equipment report.' },
      'cards': {
        'map': { 'title': 'World map', 'description': 'Opportunities plotted by country with bubble sizing by count', 'category': 'Opportunity reports' },
        'country': { 'title': 'By country', 'description': 'Donut chart breakdown of opportunities by country', 'category': 'Opportunity reports' },
        'timeline': { 'title': 'Timeline', 'description': 'Opportunities plotted on a timeline by opening and closing dates', 'category': 'Opportunity reports' },
        'value': { 'title': 'Value split', 'description': 'Material vs Services breakdown across all opportunities', 'category': 'Opportunity reports' },
        'tf': { 'title': 'Ercopac / TF split', 'description': 'Sales split between Ercopac and TF across opportunities', 'category': 'Value reports' },
        'expected': { 'title': 'Expected revenue by month', 'description': 'Monthly expected revenue (discounted value × probability) plotted by closing date for the current year', 'category': 'Value reports' },
        'cs': { 'title': 'CS projects overview', 'description': 'All CS opportunities with owner, value, TF value, probability, closing and shipment dates', 'category': 'Opportunity reports' },
        'bp': { 'title': 'BP projects overview', 'description': 'All BP opportunities with owner, value, TF value, probability, closing and shipment dates', 'category': 'Opportunity reports' },
        'monthly': { 'title': 'Monthly overview', 'description': 'All opportunities with owner, value, TF value, probability, closing and shipment dates', 'category': 'Opportunity reports' },
        'resale': { 'title': 'Ercopac / Resale split', 'description': 'Breakdown between direct Ercopac revenue and resale revenue', 'category': 'Value reports' },
        'equipment': { 'title': 'Equipment overview', 'description': 'Equipment quantities across all opportunities, grouped by type', 'category': 'Opportunity reports' },
        'shipment': { 'title': 'Equipment shipment on time', 'description': 'Shipment dates versus closing dates for equipment opportunities', 'category': 'Opportunity reports' }
      }
    },
    'settings': {
      'pipelineStages': 'Pipeline stages', 'equipmentType': 'Equipment type', 'industry': 'Industry', 'reportSchedule': 'Report schedule', 'notifications': 'Notifications', 'loading': 'Loading settings...', 'manageStages': 'Manage the stages, colours and default probabilities used by your sales pipeline.', 'addStage': 'Add stage', 'colour': 'Colour', 'stageName': 'Stage name', 'probability': 'Probability', 'order': 'Order', 'moveUp': 'Move up', 'moveDown': 'Move down', 'removeStage': 'Remove stage', 'newStageName': 'New stage name', 'add': 'Add', 'cancel': 'Cancel', 'noStagesConfigured': 'No pipeline stages configured', 'addStageHint': 'Add a stage to start building your opportunity pipeline.', 'changingStageHint': 'Changing an opportunity\'s stage automatically applies that stage\'s probability.', 'equipmentCatalogue': 'Equipment type catalogue', 'defineEquipment': 'Define the equipment codes and names available on opportunities.', 'addEquipment': 'Add equipment', 'code': 'Code', 'equipmentName': 'Equipment name', 'actions': 'Actions', 'removeEquipment': 'Remove equipment type', 'noEquipmentTypes': 'No equipment types yet', 'addFirstType': 'Add the first type to make it available on opportunities.', 'industryCatalogue': 'Industry catalogue', 'defineIndustries': 'Define the sectors available when creating and editing accounts.', 'addIndustry': 'Add industry', 'industryName': 'Industry name', 'removeIndustry': 'Remove industry', 'noIndustriesConfigured': 'No industries configured', 'addIndustryHint': 'Add an industry to make it available on accounts.', 'configureDelivery': 'Configure automatic delivery of live CRM reports by email.', 'addSchedule': 'Add schedule', 'report': 'Report', 'typeFilter': 'Type filter', 'frequency': 'Frequency', 'recipients': 'Recipients', 'active': 'Active', 'save': 'Save', 'removeSchedule': 'Remove schedule', 'noScheduledReports': 'No scheduled reports', 'addScheduleHint': 'Add a schedule to deliver current CRM data automatically.', 'chooseEvents': 'Choose which CRM events should reach you by email.', 'saving': 'Saving…', 'emailNotifications': 'Email notifications', 'emailNotificationsDesc': 'Receive updates about your opportunities by email.', 'stageChangeAlerts': 'Stage change alerts', 'stageChangeAlertsDesc': 'Get notified when an opportunity moves to a new stage.', 'closingDateReminders': 'Closing date reminders', 'closingDateRemindersDesc': 'Receive a reminder seven days before an opportunity closes.', 'allTypes': 'All types',
      'error': { 'load': 'Unable to load CRM settings.', 'saveEquipment': 'Unable to save equipment.', 'addEquipment': 'Unable to add equipment.', 'deactivateEquipment': 'Unable to deactivate equipment.', 'saveSchedule': 'Unable to save schedule.', 'removeSchedule': 'Unable to remove schedule.', 'saveStage': 'Unable to save stage.', 'reorderStages': 'Unable to reorder stages.', 'addStage': 'Unable to add stage.', 'deleteStage': 'Unable to delete stage.', 'saveIndustry': 'Unable to save industry.', 'addIndustry': 'Unable to add industry.', 'deleteIndustry': 'Unable to delete industry.', 'savePreferences': 'Unable to save notification preferences.', 'recipientsRequired': 'Recipients are required for every active report schedule.' },
      'toast': { 'equipmentSaved': 'Equipment saved', 'equipmentAdded': 'Equipment added', 'equipmentDeactivated': 'Equipment deactivated', 'scheduleSaved': 'Schedule saved', 'stageSaved': 'Pipeline stage saved', 'stageOrderSaved': 'Stage order saved', 'stageAdded': 'Pipeline stage added', 'industrySaved': 'Industry saved', 'industryAdded': 'Industry added', 'industryDeleted': 'Industry deleted', 'preferencesSaved': 'Notification preferences saved' },
      'confirm': { 'deactivateEquipment': 'Deactivate this equipment type?', 'removeSchedule': 'Remove this schedule?', 'deleteStage': 'Delete this stage?', 'deleteIndustry': 'Delete this industry?' },
      'reports': { 'WORLD_MAP': 'World map', 'BY_COUNTRY': 'By country', 'TIMELINE': 'Timeline', 'VALUE_SPLIT': 'Material vs Services', 'ERCOPAC_TF': 'Ercopac / TF split', 'ERCOPAC_RESALE': 'Ercopac / Resale split', 'MONTHLY_OVERVIEW': 'Monthly overview', 'CS_PROJECTS': 'CS projects overview', 'BP_PROJECTS': 'BP projects overview', 'EXPECTED_REVENUE': 'Expected revenue by month', 'EQUIPMENT_OVERVIEW': 'Equipment overview', 'EQUIPMENT_SHIPMENT_ON_TIME': 'Equipment shipment on time' }
    },
    'analytics': {
      'pageTitle': 'Analytics', 'pageSubtitle': 'Pipeline & performance overview', 'opportunityType': 'Opportunity type', 'allTypes': 'All types', 'loading': 'Loading analytics…', 'opportunities': 'Opportunities', 'allOpportunityTypes': 'All opportunity types', 'totalPipelineValue': 'Total pipeline value', 'openOpportunities': 'Open opportunities', 'wonValue': 'Won value', 'closedWonOpportunities': 'Closed-won opportunities', 'activeLeads': 'Active leads', 'organisationContacts': 'Organisation contacts', 'pipelineByStage': 'Pipeline by stage', 'noStagesConfigured': 'No pipeline stages are configured.', 'leadsBySource': 'Leads by source', 'noLeadSourceData': 'No lead-source data is available.', 'opportunitiesOverview': 'Opportunities overview', 'records': 'records', 'account': 'Account', 'stage': 'Stage', 'material': 'Material', 'services': 'Services', 'totalValue': 'Total value', 'probability': 'Probability', 'expectedRevenue': 'Expected revenue', 'noOppsMatchFilter': 'No opportunities match this filter.',
      'error': { 'load': 'Could not load CRM analytics. Please try again.' }
    },
    'accounts': {
      'pageTitle': 'Accounts', 'pageSubtitle': 'All companies', 'searchPlaceholder': 'Search accounts', 'gridView': 'Grid view', 'listView': 'List view', 'newAccount': 'New account', 'loading': 'Loading accounts...', 'locationNotSpecified': 'Location not specified', 'opportunities': 'Opportunities', 'contacts': 'Contacts', 'pipeline': 'Pipeline', 'owner': 'Owner', 'unassigned': 'Unassigned', 'noAccountsMatch': 'No accounts match your search.', 'company': 'Company', 'industry': 'Industry', 'country': 'Country', 'city': 'City', 'newAccountTitle': 'New account', 'companyName': 'Company name *', 'selectIndustry': 'Select industry', 'selectCountry': 'Select country', 'phone': 'Phone', 'address': 'Address', 'website': 'Website', 'employees': 'Employees', 'annualRevenue': 'Annual revenue', 'accountOwner': 'Account owner', 'notes': 'Notes', 'cancel': 'Cancel', 'creating': 'Creating...', 'createAccount': 'Create account',
      'error': { 'requiredName': 'Company name is required.', 'unableToComplete': 'Unable to complete the request.' }
    }
  },
  fr: {
    'header.search.placeholder': 'Rechercher des enregistrements...',
    'header.workspaces': 'Espaces de travail',
    'nav.main': 'Principal',
    'nav.dashboard': 'Tableau de bord',
    'nav.accounts': 'Comptes',
    'nav.leads': 'Prospects',
    'nav.opportunities': 'Opportunités',
    'nav.managerView': 'Vue Manager',
    'nav.insights': 'Analyses',
    'nav.reports': 'Rapports',
    'nav.analytics': 'Statistiques',
    'nav.configuration': 'Configuration',
    'nav.settings': 'Paramètres',
    'search.searching': 'Recherche en cours...',
    'search.noResults': 'Aucun enregistrement CRM correspondant.',
    'search.account': 'Compte',
    'search.lead': 'Prospect',
    'search.opportunity': 'Opportunité',
    'dashboard.welcomeBack': 'Bon retour',
    'dashboard.viewReports': 'Voir les rapports',
    'dashboard.newOpportunity': 'Nouvelle opportunité',
    'dashboard.openOpportunities': 'Opportunités ouvertes',
    'dashboard.currentlyOpen': 'Actuellement ouvertes',
    'dashboard.pipelineValue': 'Valeur du pipeline',
    'dashboard.dealsWord': 'affaires',
    'dashboard.openPipelineLabel': 'pipeline ouvert',
    'dashboard.activeLeads': 'Prospects actifs',
    'dashboard.inProgress': 'En cours',
    'dashboard.noActiveLeads': 'Aucun prospect actif',
    'dashboard.wonThisMonth': 'Gagnés ce mois-ci',
    'dashboard.closedThisMonth': 'Clôturés ce mois-ci',
    'dashboard.opportunityPipeline': 'Pipeline des opportunités',
    'dashboard.viewAll': 'Tout voir',
    'dashboard.noDeals': 'Aucune affaire trouvée.',
    'dashboard.recentActivity': 'Activité récente',
    'dashboard.noRecentActivity': 'Aucune activité récente.',
    'dashboard.closingThisMonth': 'Clôture ce mois-ci',
    'dashboard.col.opportunity': 'Opportunité',
    'dashboard.col.stage': 'Étape',
    'dashboard.col.value': 'Valeur',
    'dashboard.col.closing': 'Clôture',
    'dashboard.col.owner': 'Propriétaire',
    'dashboard.noClosingOpportunities': 'Aucune opportunité en clôture.',
    'dashboard.leadsBySource': 'Prospects par source',
    'dashboard.leadsUnit': 'prospects',
    'dashboard.noLeadsYet': 'Aucun prospect pour le moment.',
    'dashboard.loading': 'Chargement du tableau de bord...',
    'modal.newOpportunity.title': 'Nouvelle opportunité',
    'modal.oppName': "Nom de l'opportunité",
    'modal.oppNamePlaceholder': "Entrez le nom de l'opportunité",
    'modal.account': 'Compte',
    'modal.selectAccount': 'Sélectionner un compte',
    'modal.material': 'Valeur matériel',
    'modal.services': 'Valeur services',
    'modal.discount': 'Remise (%)',
    'modal.stage': 'Étape',
    'modal.closingDate': 'Date de clôture',
    'modal.cancel': 'Annuler',
    'modal.creating': 'Création en cours...',
    'modal.createOpportunity': "Créer l'opportunité",
    'leads': {
      'pageTitle': 'Prospects', 'totalLeads': 'prospects au total', 'searchPlaceholder': 'Rechercher des contacts…', 'createLead': 'Créer un prospect', 'filterAll': 'Tous les prospects', 'filterConverted': 'Convertis', 'filterNotContacted': 'Non contactés', 'filterContacted': 'Contactés', 'loading': 'Chargement des prospects…',
      'col': { 'name': 'Nom du prospect', 'account': 'Compte', 'jobTitle': 'Fonction', 'email': 'E-mail', 'phone': 'Téléphone', 'source': 'Source', 'status': 'Statut', 'owner': 'Propriétaire' },
      'empty': 'Aucun prospect ne correspond aux filtres sélectionnés.',
      'modal': { 'title': 'Créer un prospect', 'fullName': 'Nom complet *', 'account': 'Compte *', 'selectAccount': 'Sélectionner un compte', 'jobTitle': 'Fonction', 'email': 'E-mail', 'phone': 'Téléphone', 'mobile': 'Mobile', 'source': 'Source', 'owner': 'Propriétaire', 'unassigned': 'Non attribué', 'notes': 'Notes et description', 'cancel': 'Annuler', 'creating': 'Création en cours…', 'create': 'Créer le prospect' },
      'error': { 'required': 'Le nom et le compte sont obligatoires.', 'load': 'Impossible de charger les prospects.', 'save': "Impossible d'enregistrer le prospect.", 'update': 'Impossible de mettre à jour le prospect.', 'delete': 'Impossible de supprimer le prospect.' },
      'confirm': { 'delete': 'Supprimer {name} ?' }
    },
    'leadDetail': {
      'backToLeads': 'Prospects', 'convertToOpportunity': 'Convertir en opportunité', 'delete': 'Supprimer', 'contactFallback': 'Contact', 'contactInfoTitle': 'Informations de contact', 'editableHint': 'tous les champs sont modifiables', 'edit': 'Modifier',
      'field': { 'fullName': 'Nom complet', 'email': 'E-mail', 'phone': 'Téléphone', 'mobile': 'Mobile', 'jobTitle': 'Fonction', 'account': 'Compte', 'owner': 'Propriétaire', 'source': 'Source', 'rating': 'Évaluation', 'leadSource': 'Source du prospect', 'leadOwner': 'Propriétaire du prospect', 'status': 'Statut', 'created': 'Créé le', 'opportunities': 'Opportunités' },
      'unassigned': 'Non attribué',
      'source': { 'referral': 'Recommandation', 'tradeFair': 'Salon professionnel', 'agent': 'Agent', 'customer': 'Client', 'partner': 'Partenaire', 'other': 'Autre' },
      'rating': { 'none': 'Aucune évaluation', 'hot': 'Chaud', 'warm': 'Tiède', 'cold': 'Froid' },
      'cancel': 'Annuler', 'save': 'Enregistrer', 'companyInfoTitle': 'Informations sur l\'entreprise', 'industryNotSpecified': 'Secteur non spécifié', 'countryNotSpecified': 'Pays non spécifié', 'noAccountLinked': 'Aucun compte lié.', 'additionalInfoTitle': 'Informations supplémentaires', 'notesTitle': 'Notes et description', 'noNotes': 'Aucune note enregistrée.', 'summaryTitle': 'Résumé du prospect', 'activityTitle': 'Activité', 'log': 'Journal', 'activityPlaceholder': 'Décrivez l\'activité…', 'logActivityBtn': 'Enregistrer l\'activité', 'noActivity': 'Aucune activité enregistrée.', 'relatedOppsTitle': 'Opportunités liées', 'noRelatedOpps': 'Aucune opportunité liée.', 'loading': 'Chargement du prospect…', 'confirmDelete': 'Supprimer ce prospect ?',
      'error': { 'notFound': 'Prospect introuvable.', 'save': 'Impossible d\'enregistrer.', 'convert': 'Impossible de convertir.', 'delete': 'Impossible de supprimer.', 'logActivity': 'Impossible d\'enregistrer l\'activité.' },
      'toast': { 'saved': 'Opportunité enregistrée', 'equipmentSaved': 'Équipement enregistré', 'stageUpdated': 'Étape mise à jour', 'teamAssigned': 'membre(s) assigné(s)', 'notePosted': 'Note publiée', 'fileAttached': 'Fichier joint' }
    },
    'opportunities': {
      'pageTitle': 'Opportunités', 'pageSubtitle': 'Votre pipeline', 'searchPlaceholder': 'Rechercher des opportunités…', 'newOpportunity': 'Nouvelle opportunité', 'allStages': 'Toutes les étapes', 'loading': 'Chargement des opportunités…', 'unassigned': 'Non attribué', 'empty': 'Aucune opportunité ne correspond aux filtres sélectionnés.',
      'col': { 'name': "Nom de l'opportunité", 'account': 'Compte', 'stage': 'Étape', 'value': 'Valeur', 'probability': 'Probabilité', 'closingDate': 'Date de clôture', 'owner': 'Propriétaire' },
      'modal': { 'title': 'Nouvelle opportunité', 'name': "Nom de l'opportunité *", 'account': 'Compte *', 'selectAccount': 'Sélectionner un compte', 'contactPerson': 'Personne de contact', 'selectContact': 'Sélectionner un contact', 'owner': 'Propriétaire', 'unassigned': 'Non attribué', 'stage': 'Étape du pipeline', 'probability': 'Probabilité (%)', 'discount': 'Remise (%)', 'supplyCategory': 'Catégorie de fourniture', 'selectCategory': 'Sélectionner une catégorie', 'materialValue': 'Valeur matériel', 'servicesValue': 'Valeur services', 'totalValue': 'Valeur totale', 'ercopacSalesSplit': 'Part des ventes Ercopac', 'thirdPartySalesSplit': 'Part des ventes tiers', 'totalSalesSplit': 'Total part des ventes', 'ercopacResaleSplit': 'Part de revente Ercopac', 'resaleSplit': 'Part de revente', 'totalResaleSplit': 'Total part de revente', 'closingDate': 'Date de clôture', 'opportunityType': "Type d'opportunité", 'cancel': 'Annuler', 'creating': 'Création en cours…', 'create': "Créer l'opportunité" },
      'error': { 'loadFormData': 'Impossible de charger les données du formulaire.', 'load': 'Impossible de charger les opportunités.', 'required': 'Le nom et le compte sont obligatoires.', 'probability': 'La probabilité doit être entre 0 et 100.', 'discount': 'La remise doit être entre 0 et 100.', 'salesSplit': 'La part des ventes doit égaler la valeur totale.', 'resaleSplit': 'La part de revente doit égaler la valeur totale.', 'create': "Impossible de créer l'opportunité." }
    },
    'opportunityDetail': {
      'backToOpportunities': 'Opportunités', 'readOnly': 'Lecture seule', 'delete': 'Supprimer', 'unassigned': 'Non attribué', 'owner': 'Propriétaire', 'pipeline': 'Pipeline', 'closing': 'Clôture', 'relatedList': 'Liste associée', 'overview': 'Aperçu', 'value': 'Valeur', 'details': 'Détails', 'equipment': 'Équipement', 'notes': 'Notes', 'attachments': 'Pièces jointes', 'history': 'Historique', 'salesSummary': 'Résumé des ventes', 'probability': 'Probabilité', 'cycleDuration': 'Durée du cycle', 'opportunityName': "Nom de l'opportunité", 'opportunityOwner': "Propriétaire de l'opportunité", 'stage': 'Étape', 'discount': 'Remise', 'expectedRevenue': 'Revenu attendu', 'quoteRequestedDate': 'Date de demande de devis', 'closingDate': 'Date de clôture', 'shipmentDate': "Date d'expédition", 'account': 'Compte', 'contactPerson': 'Personne de contact', 'selectContact': 'Sélectionner un contact', 'valueInformation': 'Informations sur la valeur', 'costBreakdown': 'Répartition des coûts', 'material': 'Matériel', 'services': 'Services', 'totalValue': 'Valeur totale', 'salesSplit': 'Répartition des ventes', 'ercopac': 'Ercopac', 'tf': 'TF', 'resaleSplit': 'Répartition de la revente', 'resale': 'Revente', 'splitIs': 'La répartition est', 'opportunityDetails': "Détails de l'opportunité", 'clickToEdit': 'Cliquez sur une valeur pour modifier', 'readOnlyInfo': 'Informations en lecture seule', 'opportunityType': "Type d'opportunité", 'supplyCategory': 'Catégorie de fourniture', 'selectCategory': 'Sélectionner une catégorie', 'probabilityPercent': 'Probabilité (%)', 'quoteNumber': 'Numéro de devis', 'team': 'Équipe', 'noTeamMembers': 'Aucun membre assigné', 'addMember': 'Ajouter un membre…', 'quoteSubmitted': 'Devis soumis', 'nextStep': 'Prochaine étape', 'description': 'Description', 'addDescription': 'Ajouter une description…', 'saving': 'Enregistrement…', 'saveOpportunity': "Enregistrer l'opportunité", 'opportunityEquipment': "Équipement de l'opportunité", 'addItem': 'Ajouter un élément', 'qty': 'Qté', 'removeEquipment': "Supprimer l'équipement", 'noEquipmentAdded': "Aucun équipement ajouté.", 'quantity': 'Quantité', 'add': 'Ajouter', 'cancel': 'Annuler', 'postNote': 'Publier la note', 'writeNote': 'Écrire une note…', 'noNotesPosted': 'Aucune note publiée.', 'attachFile': 'Joindre un fichier', 'download': 'Télécharger', 'noAttachments': 'Aucune pièce jointe.', 'modificationHistory': 'Historique des modifications', 'system': 'Système', 'changedFromTo': 'modifié de', 'to': 'à', 'noModifications': 'Aucune modification enregistrée.', 'stageHistory': 'Historique des étapes', 'modifiedBy': 'Modifié par', 'entered': 'Entré le', 'teamSelectResources': 'Équipe — sélectionner les ressources', 'teamSelectDesc': 'Sélectionnez les membres licenciés assignés à cette opportunité.', 'noActiveUsers': 'Aucun utilisateur CRM actif disponible.', 'saveTeam': "Enregistrer l'équipe", 'loadingWorkspace': 'Chargement de l\'espace de travail…', 'confirmDelete': "Supprimer cette opportunité ?",
      'error': { 'notFound': 'Opportunité introuvable.', 'save': "Impossible d'enregistrer.", 'changeStage': "Impossible de changer l'étape.", 'saveTeam': "Impossible d'enregistrer l'équipe.", 'postNote': 'Impossible de publier la note.', 'upload': 'Impossible de télécharger le fichier.', 'delete': 'Impossible de supprimer.', 'negativeValues': 'Les valeurs ne peuvent pas être négatives.', 'discountRange': 'La remise doit être entre 0 et 100 %.', 'salesSplit': 'La répartition des ventes doit égaler la valeur totale.', 'resaleSplit': 'La répartition de la revente doit égaler la valeur totale.' }
    },
    'reports': {
      'pageTitle': 'Rapports', 'pageSubtitle': 'Tous les rapports', 'loading': 'Chargement des rapports...', 'opportunityReports': 'Rapports sur les opportunités', 'valueReports': 'Rapports sur la valeur', 'back': 'Rapports', 'allTypes': 'Tous les types', 'allStages': 'Toutes les étapes', 'allTime': 'Toutes les périodes', 'thisMonth': 'Ce mois-ci', 'thisQuarter': 'Ce trimestre', 'thisYear': 'Cette année', 'allMonths': 'Tous les mois', 'exportExcel': 'Excel', 'exportPdf': 'PDF', 'opportunities': 'Opportunités', 'pipelineValue': 'Valeur du pipeline', 'expectedRevenue': 'Revenu attendu', 'equipmentTypes': "Types d'équipement", 'totalUnits': 'Unités totales', 'oppsWithEquipment': 'Opps avec équipement', 'noEquipmentData': "Aucune donnée d'équipement pour les filtres sélectionnés. Ajoutez d'abord des équipements aux opportunités.", 'paretoTitle': 'Pareto — fréquence des équipements', 'paretoSubtitle': 'Barres = unités · Ligne rouge = % cumulé', 'distributionTitle': 'Répartition par type d\'équipement', 'totalUnitsLabel': 'unités totales', 'equipmentPerOpp': 'Équipement par opportunité', 'account': 'Compte', 'type': 'Type', 'stage': 'Étape', 'equipment': 'Équipement', 'totalUnitsCol': 'Unités totales', 'opportunitiesTracked': 'Opportunités suivies', 'totalUnitsToShip': 'Unités totales à expédier', 'noShipmentData': "Aucune opportunité avec équipement et date d'expédition trouvée.", 'equipmentUnitsByMonth': "Unités d'équipement par mois d'expédition", 'shipmentSubtitle': "Chaque ligne = un type d'équipement · Points = expéditions réelles · Pointillés = aujourd'hui", 'monthlyShipmentMatrix': "Matrice d'expédition mensuelle", 'matrixSubtitle': 'Bleu = mois en cours · — = aucune expédition', 'monthlyTotal': 'Total mensuel', 'shipmentDetail': "Détail de l'expédition", 'qty': 'Qté', 'shipmentDate': "Date d'expédition", 'worldMapTitle': 'Carte du monde — opportunités par pays', 'mapSubtitle': 'Taille de la bulle = nombre d\'opportunités', 'loadingMap': 'Chargement de la carte géographique...', 'noOppsMatchFilters': 'Aucune opportunité ne correspond aux filtres sélectionnés.', 'distributionByCountry': 'Répartition par pays', 'breakdownByCountry': 'Détail par pays', 'opportunitiesLabel': 'opportunités', 'timelineTitle': 'Opportunités par date d\'ouverture et de clôture', 'opened': 'Ouvert', 'closing': 'Clôture', 'materialVsServices': 'Matériel vs Services', 'ercopacTfSplit': 'Répartition des ventes Ercopac / TF', 'ercopacResaleSplit': 'Répartition Ercopac / Revente', 'realOpportunityValues': 'Valeurs réelles des opportunités', 'total': 'Total', 'expectedRevenueByMonth': 'Revenu attendu par mois', 'expectedSubtitle': 'valeur remise × probabilité', 'csProjectsOverview': 'Aperçu des projets CS', 'bpProjectsOverview': 'Aperçu des projets BP', 'monthlyOverview': 'Aperçu mensuel', 'owner': 'Propriétaire', 'value': 'Valeur', 'tfValue': 'Valeur TF', 'probability': 'Probabilité', 'closingDate': 'Date de clôture',
      'error': { 'load': 'Impossible de charger les rapports.', 'loadEquipment': "Impossible de charger le rapport d'équipement." },
      'cards': {
        'map': { 'title': 'Carte du monde', 'description': 'Opportunités tracées par pays avec taille de bulle par nombre', 'category': 'Rapports sur les opportunités' },
        'country': { 'title': 'Par pays', 'description': 'Répartition en donut des opportunités par pays', 'category': 'Rapports sur les opportunités' },
        'timeline': { 'title': 'Chronologie', 'description': 'Opportunités sur une chronologie par dates d\'ouverture et de clôture', 'category': 'Rapports sur les opportunités' },
        'value': { 'title': 'Répartition de la valeur', 'description': 'Répartition Matériel vs Services sur toutes les opportunités', 'category': 'Rapports sur les opportunités' },
        'tf': { 'title': 'Répartition Ercopac / TF', 'description': 'Répartition des ventes entre Ercopac et TF', 'category': 'Rapports sur la valeur' },
        'expected': { 'title': 'Revenu attendu par mois', 'description': 'Revenu mensuel attendu (valeur remise × probabilité) par date de clôture', 'category': 'Rapports sur la valeur' },
        'cs': { 'title': 'Aperçu des projets CS', 'description': 'Toutes les opportunités CS avec propriétaire, valeur, valeur TF, probabilité, dates', 'category': 'Rapports sur les opportunités' },
        'bp': { 'title': 'Aperçu des projets BP', 'description': 'Toutes les opportunités BP avec propriétaire, valeur, valeur TF, probabilité, dates', 'category': 'Rapports sur les opportunités' },
        'monthly': { 'title': 'Aperçu mensuel', 'description': 'Toutes les opportunités avec propriétaire, valeur, valeur TF, probabilité, dates', 'category': 'Rapports sur les opportunités' },
        'resale': { 'title': 'Répartition Ercopac / Revente', 'description': 'Répartition entre revenus directs Ercopac et revenus de revente', 'category': 'Rapports sur la valeur' },
        'equipment': { 'title': 'Aperçu des équipements', 'description': 'Quantités d\'équipements sur toutes les opportunités, groupées par type', 'category': 'Rapports sur les opportunités' },
        'shipment': { 'title': 'Expédition des équipements à temps', 'description': 'Dates d\'expédition versus dates de clôture pour les opportunités avec équipement', 'category': 'Rapports sur les opportunités' }
      }
    },
    'settings': {
      'pipelineStages': 'Étapes du pipeline', 'equipmentType': "Type d'équipement", 'industry': 'Secteur', 'reportSchedule': 'Planification des rapports', 'notifications': 'Notifications', 'loading': 'Chargement des paramètres...', 'manageStages': 'Gérez les étapes, les couleurs et les probabilités par défaut de votre pipeline de vente.', 'addStage': 'Ajouter une étape', 'colour': 'Couleur', 'stageName': "Nom de l'étape", 'probability': 'Probabilité', 'order': 'Ordre', 'moveUp': 'Monter', 'moveDown': 'Descendre', 'removeStage': "Supprimer l'étape", 'newStageName': "Nom de la nouvelle étape", 'add': 'Ajouter', 'cancel': 'Annuler', 'noStagesConfigured': 'Aucune étape de pipeline configurée', 'addStageHint': 'Ajoutez une étape pour commencer à construire votre pipeline.', 'changingStageHint': "Le changement d'étape d'une opportunité applique automatiquement sa probabilité.", 'equipmentCatalogue': "Catalogue des types d'équipement", 'defineEquipment': 'Définissez les codes et noms des équipements disponibles sur les opportunités.', 'addEquipment': 'Ajouter un équipement', 'code': 'Code', 'equipmentName': "Nom de l'équipement", 'actions': 'Actions', 'removeEquipment': "Supprimer le type d'équipement", 'noEquipmentTypes': "Aucun type d'équipement pour le moment", 'addFirstType': 'Ajoutez le premier type pour le rendre disponible.', 'industryCatalogue': 'Catalogue des secteurs', 'defineIndustries': 'Définissez les secteurs disponibles lors de la création et de la modification des comptes.', 'addIndustry': 'Ajouter un secteur', 'industryName': 'Nom du secteur', 'removeIndustry': 'Supprimer le secteur', 'noIndustriesConfigured': 'Aucun secteur configuré', 'addIndustryHint': 'Ajoutez un secteur pour le rendre disponible sur les comptes.', 'configureDelivery': 'Configurez la livraison automatique des rapports CRM par e-mail.', 'addSchedule': 'Ajouter une planification', 'report': 'Rapport', 'typeFilter': 'Filtre de type', 'frequency': 'Fréquence', 'recipients': 'Destinataires', 'active': 'Actif', 'save': 'Enregistrer', 'removeSchedule': 'Supprimer la planification', 'noScheduledReports': 'Aucun rapport planifié', 'addScheduleHint': 'Ajoutez une planification pour livrer automatiquement les données CRM.', 'chooseEvents': 'Choisissez quels événements CRM doivent vous parvenir par e-mail.', 'saving': 'Enregistrement…', 'emailNotifications': 'Notifications par e-mail', 'emailNotificationsDesc': 'Recevez des mises à jour sur vos opportunités par e-mail.', 'stageChangeAlerts': 'Alertes de changement d\'étape', 'stageChangeAlertsDesc': 'Soyez notifié lorsqu\'une opportunité passe à une nouvelle étape.', 'closingDateReminders': 'Rappels de date de clôture', 'closingDateRemindersDesc': 'Recevez un rappel sept jours avant la clôture d\'une opportunité.', 'allTypes': 'Tous les types',
      'error': { 'load': 'Impossible de charger les paramètres CRM.', 'saveEquipment': "Impossible d'enregistrer l'équipement.", 'addEquipment': "Impossible d'ajouter l'équipement.", 'deactivateEquipment': "Impossible de désactiver l'équipement.", 'saveSchedule': 'Impossible d\'enregistrer la planification.', 'removeSchedule': 'Impossible de supprimer la planification.', 'saveStage': "Impossible d'enregistrer l'étape.", 'reorderStages': "Impossible de réorganiser les étapes.", 'addStage': "Impossible d'ajouter l'étape.", 'deleteStage': "Impossible de supprimer l'étape.", 'saveIndustry': 'Impossible d\'enregistrer le secteur.', 'addIndustry': 'Impossible d\'ajouter le secteur.', 'deleteIndustry': 'Impossible de supprimer le secteur.', 'savePreferences': 'Impossible d\'enregistrer les préférences de notification.', 'recipientsRequired': 'Les destinataires sont requis pour chaque planification de rapport active.' },
      'toast': { 'equipmentSaved': 'Équipement enregistré', 'equipmentAdded': 'Équipement ajouté', 'equipmentDeactivated': 'Équipement désactivé', 'scheduleSaved': 'Planification enregistrée', 'stageSaved': 'Étape du pipeline enregistrée', 'stageOrderSaved': 'Ordre des étapes enregistré', 'stageAdded': 'Étape du pipeline ajoutée', 'industrySaved': 'Secteur enregistré', 'industryAdded': 'Secteur ajouté', 'industryDeleted': 'Secteur supprimé', 'preferencesSaved': 'Préférences de notification enregistrées' },
      'confirm': { 'deactivateEquipment': "Désactiver ce type d'équipement ?", 'removeSchedule': 'Supprimer cette planification ?', 'deleteStage': "Supprimer cette étape ?", 'deleteIndustry': 'Supprimer ce secteur ?' },
      'reports': { 'WORLD_MAP': 'Carte du monde', 'BY_COUNTRY': 'Par pays', 'TIMELINE': 'Chronologie', 'VALUE_SPLIT': 'Matériel vs Services', 'ERCOPAC_TF': 'Répartition Ercopac / TF', 'ERCOPAC_RESALE': 'Répartition Ercopac / Revente', 'MONTHLY_OVERVIEW': 'Aperçu mensuel', 'CS_PROJECTS': 'Aperçu des projets CS', 'BP_PROJECTS': 'Aperçu des projets BP', 'EXPECTED_REVENUE': 'Revenu attendu par mois', 'EQUIPMENT_OVERVIEW': 'Aperçu des équipements', 'EQUIPMENT_SHIPMENT_ON_TIME': 'Expédition des équipements à temps' }
    },
    'analytics': {
      'pageTitle': 'Statistiques', 'pageSubtitle': 'Aperçu du pipeline et des performances', 'opportunityType': "Type d'opportunité", 'allTypes': 'Tous les types', 'loading': 'Chargement des statistiques…', 'opportunities': 'Opportunités', 'allOpportunityTypes': "Tous les types d'opportunités", 'totalPipelineValue': 'Valeur totale du pipeline', 'openOpportunities': 'Opportunités ouvertes', 'wonValue': 'Valeur gagnée', 'closedWonOpportunities': 'Opportunités closes gagnées', 'activeLeads': 'Prospects actifs', 'organisationContacts': 'Contacts de l\'organisation', 'pipelineByStage': 'Pipeline par étape', 'noStagesConfigured': 'Aucune étape de pipeline n\'est configurée.', 'leadsBySource': 'Prospects par source', 'noLeadSourceData': 'Aucune donnée de source de prospect disponible.', 'opportunitiesOverview': 'Aperçu des opportunités', 'records': 'enregistrements', 'account': 'Compte', 'stage': 'Étape', 'material': 'Matériel', 'services': 'Services', 'totalValue': 'Valeur totale', 'probability': 'Probabilité', 'expectedRevenue': 'Revenu attendu', 'noOppsMatchFilter': 'Aucune opportunité ne correspond à ce filtre.',
      'error': { 'load': 'Impossible de charger les statistiques CRM. Veuillez réessayer.' }
    },
    'accounts': {
      'pageTitle': 'Comptes', 'pageSubtitle': 'Toutes les entreprises', 'searchPlaceholder': 'Rechercher des comptes', 'gridView': 'Vue grille', 'listView': 'Vue liste', 'newAccount': 'Nouveau compte', 'loading': 'Chargement des comptes...', 'locationNotSpecified': 'Emplacement non spécifié', 'opportunities': 'Opportunités', 'contacts': 'Contacts', 'pipeline': 'Pipeline', 'owner': 'Propriétaire', 'unassigned': 'Non attribué', 'noAccountsMatch': 'Aucun compte ne correspond à votre recherche.', 'company': 'Entreprise', 'industry': 'Secteur', 'country': 'Pays', 'city': 'Ville', 'newAccountTitle': 'Nouveau compte', 'companyName': 'Nom de l\'entreprise *', 'selectIndustry': 'Sélectionner un secteur', 'selectCountry': 'Sélectionner un pays', 'phone': 'Téléphone', 'address': 'Adresse', 'website': 'Site web', 'employees': 'Employés', 'annualRevenue': 'Chiffre d\'affaires annuel', 'accountOwner': 'Propriétaire du compte', 'notes': 'Notes', 'cancel': 'Annuler', 'creating': 'Création...', 'createAccount': 'Créer le compte',
      'error': { 'requiredName': 'Le nom de l\'entreprise est obligatoire.', 'unableToComplete': 'Impossible de terminer la demande.' }
    }
  },
  it: {
    'header.search.placeholder': 'Cerca record...',
    'header.workspaces': 'Aree di lavoro',
    'nav.main': 'Principale',
    'nav.dashboard': 'Dashboard',
    'nav.accounts': 'Account',
    'nav.leads': 'Contatti',
    'nav.opportunities': 'Opportunità',
    'nav.managerView': 'Vista Manager',
    'nav.insights': 'Approfondimenti',
    'nav.reports': 'Report',
    'nav.analytics': 'Analisi',
    'nav.configuration': 'Configurazione',
    'nav.settings': 'Impostazioni',
    'search.searching': 'Ricerca in corso...',
    'search.noResults': 'Nessun record CRM corrispondente.',
    'search.account': 'Account',
    'search.lead': 'Contatto',
    'search.opportunity': 'Opportunità',
    'dashboard.welcomeBack': 'Bentornato',
    'dashboard.viewReports': 'Visualizza report',
    'dashboard.newOpportunity': 'Nuova opportunità',
    'dashboard.openOpportunities': 'Opportunità aperte',
    'dashboard.currentlyOpen': 'Attualmente aperte',
    'dashboard.pipelineValue': 'Valore della pipeline',
    'dashboard.dealsWord': 'affari',
    'dashboard.openPipelineLabel': 'pipeline aperta',
    'dashboard.activeLeads': 'Contatti attivi',
    'dashboard.inProgress': 'In corso',
    'dashboard.noActiveLeads': 'Nessun contatto attivo',
    'dashboard.wonThisMonth': 'Vinti questo mese',
    'dashboard.closedThisMonth': 'Chiusi questo mese',
    'dashboard.opportunityPipeline': 'Pipeline delle opportunità',
    'dashboard.viewAll': 'Visualizza tutto',
    'dashboard.noDeals': 'Nessun affare trovato.',
    'dashboard.recentActivity': 'Attività recente',
    'dashboard.noRecentActivity': 'Nessuna attività recente.',
    'dashboard.closingThisMonth': 'In chiusura questo mese',
    'dashboard.col.opportunity': 'Opportunità',
    'dashboard.col.stage': 'Fase',
    'dashboard.col.value': 'Valore',
    'dashboard.col.closing': 'Chiusura',
    'dashboard.col.owner': 'Proprietario',
    'dashboard.noClosingOpportunities': 'Nessuna opportunità in chiusura.',
    'dashboard.leadsBySource': 'Contatti per fonte',
    'dashboard.leadsUnit': 'contatti',
    'dashboard.noLeadsYet': 'Nessun contatto ancora.',
    'dashboard.loading': 'Caricamento dashboard...',
    'modal.newOpportunity.title': 'Nuova opportunità',
    'modal.oppName': 'Nome opportunità',
    'modal.oppNamePlaceholder': "Inserisci il nome dell'opportunità",
    'modal.account': 'Account',
    'modal.selectAccount': 'Seleziona un account',
    'modal.material': 'Valore materiali',
    'modal.services': 'Valore servizi',
    'modal.discount': 'Sconto (%)',
    'modal.stage': 'Fase',
    'modal.closingDate': 'Data di chiusura',
    'modal.cancel': 'Annulla',
    'modal.creating': 'Creazione in corso...',
    'modal.createOpportunity': 'Crea opportunità',
    'leads': {
      'pageTitle': 'Contatti', 'totalLeads': 'contatti totali', 'searchPlaceholder': 'Cerca contatti…', 'createLead': 'Crea contatto', 'filterAll': 'Tutti i contatti', 'filterConverted': 'Convertiti', 'filterNotContacted': 'Non contattati', 'filterContacted': 'Contattati', 'loading': 'Caricamento contatti…',
      'col': { 'name': 'Nome contatto', 'account': 'Account', 'jobTitle': 'Titolo lavorativo', 'email': 'E-mail', 'phone': 'Telefono', 'source': 'Fonte', 'status': 'Stato', 'owner': 'Proprietario' },
      'empty': 'Nessun contatto corrisponde ai filtri selezionati.',
      'modal': { 'title': 'Crea contatto', 'fullName': 'Nome completo *', 'account': 'Account *', 'selectAccount': 'Seleziona account', 'jobTitle': 'Titolo lavorativo', 'email': 'E-mail', 'phone': 'Telefono', 'mobile': 'Cellulare', 'source': 'Fonte', 'owner': 'Proprietario', 'unassigned': 'Non assegnato', 'notes': 'Note e descrizione', 'cancel': 'Annulla', 'creating': 'Creazione in corso…', 'create': 'Crea contatto' },
      'error': { 'required': 'Nome e Account sono obbligatori.', 'load': 'Impossibile caricare i contatti.', 'save': 'Impossibile salvare il contatto.', 'update': 'Impossibile aggiornare il contatto.', 'delete': 'Impossibile eliminare il contatto.' },
      'confirm': { 'delete': 'Eliminare {name}?' }
    },
    'leadDetail': {
      'backToLeads': 'Contatti', 'convertToOpportunity': 'Converti in opportunità', 'delete': 'Elimina', 'contactFallback': 'Contatto', 'contactInfoTitle': 'Informazioni di contatto', 'editableHint': 'tutti i campi sono modificabili', 'edit': 'Modifica',
      'field': { 'fullName': 'Nome completo', 'email': 'E-mail', 'phone': 'Telefono', 'mobile': 'Cellulare', 'jobTitle': 'Titolo lavorativo', 'account': 'Account', 'owner': 'Proprietario', 'source': 'Fonte', 'rating': 'Valutazione', 'leadSource': 'Fonte del contatto', 'leadOwner': 'Proprietario del contatto', 'status': 'Stato', 'created': 'Creato il', 'opportunities': 'Opportunità' },
      'unassigned': 'Non assegnato',
      'source': { 'referral': 'Referral', 'tradeFair': 'Fiera', 'agent': 'Agente', 'customer': 'Cliente', 'partner': 'Partner', 'other': 'Altro' },
      'rating': { 'none': 'Nessuna valutazione', 'hot': 'Caldo', 'warm': 'Tiepido', 'cold': 'Freddo' },
      'cancel': 'Annulla', 'save': 'Salva', 'companyInfoTitle': 'Informazioni aziendali', 'industryNotSpecified': 'Settore non specificato', 'countryNotSpecified': 'Paese non specificato', 'noAccountLinked': 'Nessun account collegato.', 'additionalInfoTitle': 'Informazioni aggiuntive', 'notesTitle': 'Note e descrizione', 'noNotes': 'Nessuna nota registrata.', 'summaryTitle': 'Riepilogo contatto', 'activityTitle': 'Attività', 'log': 'Registro', 'activityPlaceholder': 'Descrivi l\'attività…', 'logActivityBtn': 'Registra attività', 'noActivity': 'Nessuna attività registrata.', 'relatedOppsTitle': 'Opportunità correlate', 'noRelatedOpps': 'Nessuna opportunità correlata.', 'loading': 'Caricamento contatto…', 'confirmDelete': 'Eliminare questo contatto?',
      'error': { 'notFound': 'Contatto non trovato.', 'save': 'Impossibile salvare.', 'convert': 'Impossibile convertire.', 'delete': 'Impossibile eliminare.', 'logActivity': 'Impossibile registrare l\'attività.' },
      'toast': { 'saved': 'Opportunità salvata', 'equipmentSaved': 'Attrezzatura salvata', 'stageUpdated': 'Fase aggiornata', 'teamAssigned': 'membro/i del team assegnato/i', 'notePosted': 'Nota pubblicata', 'fileAttached': 'File allegato' }
    },
    'opportunities': {
      'pageTitle': 'Opportunità', 'pageSubtitle': 'La tua pipeline', 'searchPlaceholder': 'Cerca opportunità…', 'newOpportunity': 'Nuova opportunità', 'allStages': 'Tutte le fasi', 'loading': 'Caricamento opportunità…', 'unassigned': 'Non assegnato', 'empty': 'Nessuna opportunità corrisponde ai filtri selezionati.',
      'col': { 'name': 'Nome opportunità', 'account': 'Account', 'stage': 'Fase', 'value': 'Valore', 'probability': 'Probabilità', 'closingDate': 'Data di chiusura', 'owner': 'Proprietario' },
      'modal': { 'title': 'Nuova opportunità', 'name': 'Nome opportunità *', 'account': 'Account *', 'selectAccount': 'Seleziona account', 'contactPerson': 'Persona di contatto', 'selectContact': 'Seleziona contatto', 'owner': 'Proprietario', 'unassigned': 'Non assegnato', 'stage': 'Fase della pipeline', 'probability': 'Probabilità (%)', 'discount': 'Sconto (%)', 'supplyCategory': 'Categoria di fornitura', 'selectCategory': 'Seleziona categoria', 'materialValue': 'Valore materiali', 'servicesValue': 'Valore servizi', 'totalValue': 'Valore totale', 'ercopacSalesSplit': 'Quota vendite Ercopac', 'thirdPartySalesSplit': 'Quota vendite terzi', 'totalSalesSplit': 'Totale quota vendite', 'ercopacResaleSplit': 'Quota rivendita Ercopac', 'resaleSplit': 'Quota rivendita', 'totalResaleSplit': 'Totale quota rivendita', 'closingDate': 'Data di chiusura', 'opportunityType': 'Tipo di opportunità', 'cancel': 'Annulla', 'creating': 'Creazione in corso…', 'create': 'Crea opportunità' },
      'error': { 'loadFormData': 'Impossibile caricare i dati del modulo.', 'load': 'Impossibile caricare le opportunità.', 'required': 'Nome e Account sono obbligatori.', 'probability': 'La probabilità deve essere tra 0 e 100.', 'discount': 'Lo sconto deve essere tra 0 e 100.', 'salesSplit': 'La quota vendite deve eguagliare il valore totale.', 'resaleSplit': 'La quota rivendita deve eguagliare il valore totale.', 'create': 'Impossibile creare l\'opportunità.' }
    },
    'opportunityDetail': {
      'backToOpportunities': 'Opportunità', 'readOnly': 'Sola lettura', 'delete': 'Elimina', 'unassigned': 'Non assegnato', 'owner': 'Proprietario', 'pipeline': 'Pipeline', 'closing': 'Chiusura', 'relatedList': 'Elenco correlato', 'overview': 'Panoramica', 'value': 'Valore', 'details': 'Dettagli', 'equipment': 'Attrezzatura', 'notes': 'Note', 'attachments': 'Allegati', 'history': 'Cronologia', 'salesSummary': 'Riepilogo vendite', 'probability': 'Probabilità', 'cycleDuration': 'Durata ciclo', 'opportunityName': 'Nome opportunità', 'opportunityOwner': 'Proprietario opportunità', 'stage': 'Fase', 'discount': 'Sconto', 'expectedRevenue': 'Ricavo previsto', 'quoteRequestedDate': 'Data richiesta preventivo', 'closingDate': 'Data di chiusura', 'shipmentDate': 'Data di spedizione', 'account': 'Account', 'contactPerson': 'Persona di contatto', 'selectContact': 'Seleziona contatto', 'valueInformation': 'Informazioni sul valore', 'costBreakdown': 'Ripartizione costi', 'material': 'Materiali', 'services': 'Servizi', 'totalValue': 'Valore totale', 'salesSplit': 'Ripartizione vendite', 'ercopac': 'Ercopac', 'tf': 'TF', 'resaleSplit': 'Ripartizione rivendita', 'resale': 'Rivendita', 'splitIs': 'La ripartizione è', 'opportunityDetails': 'Dettagli opportunità', 'clickToEdit': 'Clicca su un valore per modificare', 'readOnlyInfo': 'Informazioni in sola lettura', 'opportunityType': 'Tipo di opportunità', 'supplyCategory': 'Categoria di fornitura', 'selectCategory': 'Seleziona categoria', 'probabilityPercent': 'Probabilità (%)', 'quoteNumber': 'Numero preventivo', 'team': 'Team', 'noTeamMembers': 'Nessun membro del team assegnato', 'addMember': 'Aggiungi membro…', 'quoteSubmitted': 'Preventivo inviato', 'nextStep': 'Prossimo passo', 'description': 'Descrizione', 'addDescription': 'Aggiungi una descrizione…', 'saving': 'Salvataggio…', 'saveOpportunity': 'Salva opportunità', 'opportunityEquipment': 'Attrezzatura opportunità', 'addItem': 'Aggiungi elemento', 'qty': 'Qtà', 'removeEquipment': 'Rimuovi attrezzatura', 'noEquipmentAdded': 'Nessuna attrezzatura aggiunta.', 'quantity': 'Quantità', 'add': 'Aggiungi', 'cancel': 'Annulla', 'postNote': 'Pubblica nota', 'writeNote': 'Scrivi una nota…', 'noNotesPosted': 'Nessuna nota pubblicata.', 'attachFile': 'Allega file', 'download': 'Scarica', 'noAttachments': 'Nessun allegato.', 'modificationHistory': 'Cronologia modifiche', 'system': 'Sistema', 'changedFromTo': 'modificato da', 'to': 'a', 'noModifications': 'Nessuna modifica registrata.', 'stageHistory': 'Cronologia fasi', 'modifiedBy': 'Modificato da', 'entered': 'Inserito il', 'teamSelectResources': 'Team — seleziona risorse', 'teamSelectDesc': 'Seleziona i membri del team con licenza assegnati a questa opportunità.', 'noActiveUsers': 'Nessun utente CRM attivo disponibile.', 'saveTeam': 'Salva team', 'loadingWorkspace': 'Caricamento area di lavoro…', 'confirmDelete': 'Eliminare questa opportunità?',
      'error': { 'notFound': 'Opportunità non trovata.', 'save': 'Impossibile salvare.', 'changeStage': 'Impossibile cambiare fase.', 'saveTeam': 'Impossibile salvare il team.', 'postNote': 'Impossibile pubblicare la nota.', 'upload': 'Impossibile caricare il file.', 'delete': 'Impossibile eliminare.', 'negativeValues': 'I valori non possono essere negativi.', 'discountRange': 'Lo sconto deve essere tra 0 e 100%.', 'salesSplit': 'La ripartizione vendite deve eguagliare il valore totale.', 'resaleSplit': 'La ripartizione rivendita deve eguagliare il valore totale.' }
    },
    'reports': {
      'pageTitle': 'Report', 'pageSubtitle': 'Tutti i report', 'loading': 'Caricamento report...', 'opportunityReports': 'Report opportunità', 'valueReports': 'Report valore', 'back': 'Report', 'allTypes': 'Tutti i tipi', 'allStages': 'Tutte le fasi', 'allTime': 'Tutto il tempo', 'thisMonth': 'Questo mese', 'thisQuarter': 'Questo trimestre', 'thisYear': 'Quest\'anno', 'allMonths': 'Tutti i mesi', 'exportExcel': 'Excel', 'exportPdf': 'PDF', 'opportunities': 'Opportunità', 'pipelineValue': 'Valore pipeline', 'expectedRevenue': 'Ricavo previsto', 'equipmentTypes': 'Tipi di attrezzatura', 'totalUnits': 'Unità totali', 'oppsWithEquipment': 'Opp con attrezzatura', 'noEquipmentData': 'Nessun dato attrezzatura per i filtri selezionati. Aggiungi prima le attrezzature alle opportunità.', 'paretoTitle': 'Pareto — frequenza attrezzature', 'paretoSubtitle': 'Barre = unità · Linea rossa = % cumulativo', 'distributionTitle': 'Distribuzione per tipo di attrezzatura', 'totalUnitsLabel': 'unità totali', 'equipmentPerOpp': 'Attrezzatura per opportunità', 'account': 'Account', 'type': 'Tipo', 'stage': 'Fase', 'equipment': 'Attrezzatura', 'totalUnitsCol': 'Unità totali', 'opportunitiesTracked': 'Opportunità tracciate', 'totalUnitsToShip': 'Unità totali da spedire', 'noShipmentData': 'Nessuna opportunità con attrezzatura e data di spedizione trovata.', 'equipmentUnitsByMonth': 'Unità attrezzatura per mese di spedizione', 'shipmentSubtitle': 'Ogni linea = un tipo di attrezzatura · Punti = spedizioni reali · Tratteggiato = oggi', 'monthlyShipmentMatrix': 'Matrice spedizioni mensili', 'matrixSubtitle': 'Blu = mese corrente · — = nessuna spedizione', 'monthlyTotal': 'Totale mensile', 'shipmentDetail': 'Dettaglio spedizione', 'qty': 'Qtà', 'shipmentDate': 'Data spedizione', 'worldMapTitle': 'Mappa del mondo — opportunità per paese', 'mapSubtitle': 'Dimensione bolla = numero opportunità', 'loadingMap': 'Caricamento mappa geografica...', 'noOppsMatchFilters': 'Nessuna opportunità corrisponde ai filtri selezionati.', 'distributionByCountry': 'Distribuzione per paese', 'breakdownByCountry': 'Dettaglio per paese', 'opportunitiesLabel': 'opportunità', 'timelineTitle': 'Opportunità per data di apertura e chiusura', 'opened': 'Aperto', 'closing': 'Chiusura', 'materialVsServices': 'Materiali vs Servizi', 'ercopacTfSplit': 'Ripartizione vendite Ercopac / TF', 'ercopacResaleSplit': 'Ripartizione Ercopac / Rivendita', 'realOpportunityValues': 'Valori reali delle opportunità', 'total': 'Totale', 'expectedRevenueByMonth': 'Ricavo previsto per mese', 'expectedSubtitle': 'valore scontato × probabilità', 'csProjectsOverview': 'Panoramica progetti CS', 'bpProjectsOverview': 'Panoramica progetti BP', 'monthlyOverview': 'Panoramica mensile', 'owner': 'Proprietario', 'value': 'Valore', 'tfValue': 'Valore TF', 'probability': 'Probabilità', 'closingDate': 'Data di chiusura',
      'error': { 'load': 'Impossibile caricare i report.', 'loadEquipment': 'Impossibile caricare il report attrezzature.' },
      'cards': {
        'map': { 'title': 'Mappa del mondo', 'description': 'Opportunità tracciate per paese con dimensione bolla per numero', 'category': 'Report opportunità' },
        'country': { 'title': 'Per paese', 'description': 'Grafico a ciambella delle opportunità per paese', 'category': 'Report opportunità' },
        'timeline': { 'title': 'Cronologia', 'description': 'Opportunità su una cronologia per date di apertura e chiusura', 'category': 'Report opportunità' },
        'value': { 'title': 'Ripartizione valore', 'description': 'Ripartizione Materiali vs Servizi su tutte le opportunità', 'category': 'Report opportunità' },
        'tf': { 'title': 'Ripartizione Ercopac / TF', 'description': 'Ripartizione vendite tra Ercopac e TF', 'category': 'Report valore' },
        'expected': { 'title': 'Ricavo previsto per mese', 'description': 'Ricavo mensile previsto (valore scontato × probabilità) per data di chiusura', 'category': 'Report valore' },
        'cs': { 'title': 'Panoramica progetti CS', 'description': 'Tutte le opportunità CS con proprietario, valore, valore TF, probabilità, date', 'category': 'Report opportunità' },
        'bp': { 'title': 'Panoramica progetti BP', 'description': 'Tutte le opportunità BP con proprietario, valore, valore TF, probabilità, date', 'category': 'Report opportunità' },
        'monthly': { 'title': 'Panoramica mensile', 'description': 'Tutte le opportunità con proprietario, valore, valore TF, probabilità, date', 'category': 'Report opportunità' },
        'resale': { 'title': 'Ripartizione Ercopac / Rivendita', 'description': 'Ripartizione tra ricavi diretti Ercopac e ricavi da rivendita', 'category': 'Report valore' },
        'equipment': { 'title': 'Panoramica attrezzature', 'description': 'Quantità di attrezzature su tutte le opportunità, raggruppate per tipo', 'category': 'Report opportunità' },
        'shipment': { 'title': 'Spedizione attrezzature in tempo', 'description': 'Date di spedizione vs date di chiusura per le opportunità con attrezzatura', 'category': 'Report opportunità' }
      }
    },
    'settings': {
      'pipelineStages': 'Fasi della pipeline', 'equipmentType': 'Tipo di attrezzatura', 'industry': 'Settore', 'reportSchedule': 'Pianificazione report', 'notifications': 'Notifiche', 'loading': 'Caricamento impostazioni...', 'manageStages': 'Gestisci le fasi, i colori e le probabilità predefinite della tua pipeline di vendita.', 'addStage': 'Aggiungi fase', 'colour': 'Colore', 'stageName': 'Nome fase', 'probability': 'Probabilità', 'order': 'Ordine', 'moveUp': 'Sposta su', 'moveDown': 'Sposta giù', 'removeStage': 'Rimuovi fase', 'newStageName': 'Nome nuova fase', 'add': 'Aggiungi', 'cancel': 'Annulla', 'noStagesConfigured': 'Nessuna fase della pipeline configurata', 'addStageHint': 'Aggiungi una fase per iniziare a costruire la tua pipeline.', 'changingStageHint': 'Il cambio di fase di un\'opportunità applica automaticamente la sua probabilità.', 'equipmentCatalogue': 'Catalogo tipi di attrezzatura', 'defineEquipment': 'Definisci i codici e i nomi delle attrezzature disponibili sulle opportunità.', 'addEquipment': 'Aggiungi attrezzatura', 'code': 'Codice', 'equipmentName': 'Nome attrezzatura', 'actions': 'Azioni', 'removeEquipment': 'Rimuovi tipo di attrezzatura', 'noEquipmentTypes': 'Nessun tipo di attrezzatura ancora', 'addFirstType': 'Aggiungi il primo tipo per renderlo disponibile.', 'industryCatalogue': 'Catalogo settori', 'defineIndustries': 'Definisci i settori disponibili durante la creazione e la modifica degli account.', 'addIndustry': 'Aggiungi settore', 'industryName': 'Nome settore', 'removeIndustry': 'Rimuovi settore', 'noIndustriesConfigured': 'Nessun settore configurato', 'addIndustryHint': 'Aggiungi un settore per renderlo disponibile sugli account.', 'configureDelivery': 'Configura la consegna automatica dei report CRM live via email.', 'addSchedule': 'Aggiungi pianificazione', 'report': 'Report', 'typeFilter': 'Filtro tipo', 'frequency': 'Frequenza', 'recipients': 'Destinatari', 'active': 'Attivo', 'save': 'Salva', 'removeSchedule': 'Rimuovi pianificazione', 'noScheduledReports': 'Nessun report pianificato', 'addScheduleHint': 'Aggiungi una pianificazione per consegnare automaticamente i dati CRM.', 'chooseEvents': 'Scegli quali eventi CRM devono raggiungerti via email.', 'saving': 'Salvataggio…', 'emailNotifications': 'Notifiche email', 'emailNotificationsDesc': 'Ricevi aggiornamenti sulle tue opportunità via email.', 'stageChangeAlerts': 'Avvisi cambio fase', 'stageChangeAlertsDesc': 'Ricevi una notifica quando un\'opportunità passa a una nuova fase.', 'closingDateReminders': 'Promemoria data di chiusura', 'closingDateRemindersDesc': 'Ricevi un promemoria sette giorni prima della chiusura di un\'opportunità.', 'allTypes': 'Tutti i tipi',
      'error': { 'load': 'Impossibile caricare le impostazioni CRM.', 'saveEquipment': 'Impossibile salvare l\'attrezzatura.', 'addEquipment': 'Impossibile aggiungere l\'attrezzatura.', 'deactivateEquipment': 'Impossibile disattivare l\'attrezzatura.', 'saveSchedule': 'Impossibile salvare la pianificazione.', 'removeSchedule': 'Impossibile rimuovere la pianificazione.', 'saveStage': 'Impossibile salvare la fase.', 'reorderStages': 'Impossibile riordinare le fasi.', 'addStage': 'Impossibile aggiungere la fase.', 'deleteStage': 'Impossibile eliminare la fase.', 'saveIndustry': 'Impossibile salvare il settore.', 'addIndustry': 'Impossibile aggiungere il settore.', 'deleteIndustry': 'Impossibile eliminare il settore.', 'savePreferences': 'Impossibile salvare le preferenze di notifica.', 'recipientsRequired': 'I destinatari sono richiesti per ogni pianificazione di report attiva.' },
      'toast': { 'equipmentSaved': 'Attrezzatura salvata', 'equipmentAdded': 'Attrezzatura aggiunta', 'equipmentDeactivated': 'Attrezzatura disattivata', 'scheduleSaved': 'Pianificazione salvata', 'stageSaved': 'Fase della pipeline salvata', 'stageOrderSaved': 'Ordine delle fasi salvato', 'stageAdded': 'Fase della pipeline aggiunta', 'industrySaved': 'Settore salvato', 'industryAdded': 'Settore aggiunto', 'industryDeleted': 'Settore eliminato', 'preferencesSaved': 'Preferenze di notifica salvate' },
      'confirm': { 'deactivateEquipment': 'Disattivare questo tipo di attrezzatura?', 'removeSchedule': 'Rimuovere questa pianificazione?', 'deleteStage': 'Eliminare questa fase?', 'deleteIndustry': 'Eliminare questo settore?' },
      'reports': { 'WORLD_MAP': 'Mappa del mondo', 'BY_COUNTRY': 'Per paese', 'TIMELINE': 'Cronologia', 'VALUE_SPLIT': 'Materiali vs Servizi', 'ERCOPAC_TF': 'Ripartizione Ercopac / TF', 'ERCOPAC_RESALE': 'Ripartizione Ercopac / Rivendita', 'MONTHLY_OVERVIEW': 'Panoramica mensile', 'CS_PROJECTS': 'Panoramica progetti CS', 'BP_PROJECTS': 'Panoramica progetti BP', 'EXPECTED_REVENUE': 'Ricavo previsto per mese', 'EQUIPMENT_OVERVIEW': 'Panoramica attrezzature', 'EQUIPMENT_SHIPMENT_ON_TIME': 'Spedizione attrezzature in tempo' }
    },
    'analytics': {
      'pageTitle': 'Analisi', 'pageSubtitle': 'Panoramica pipeline e prestazioni', 'opportunityType': 'Tipo di opportunità', 'allTypes': 'Tutti i tipi', 'loading': 'Caricamento analisi…', 'opportunities': 'Opportunità', 'allOpportunityTypes': 'Tutti i tipi di opportunità', 'totalPipelineValue': 'Valore totale pipeline', 'openOpportunities': 'Opportunità aperte', 'wonValue': 'Valore vinto', 'closedWonOpportunities': 'Opportunità chiuse vinte', 'activeLeads': 'Contatti attivi', 'organisationContacts': 'Contatti dell\'organizzazione', 'pipelineByStage': 'Pipeline per fase', 'noStagesConfigured': 'Nessuna fase della pipeline è configurata.', 'leadsBySource': 'Contatti per fonte', 'noLeadSourceData': 'Nessun dato sulla fonte dei contatti disponibile.', 'opportunitiesOverview': 'Panoramica opportunità', 'records': 'record', 'account': 'Account', 'stage': 'Fase', 'material': 'Materiali', 'services': 'Servizi', 'totalValue': 'Valore totale', 'probability': 'Probabilità', 'expectedRevenue': 'Ricavo previsto', 'noOppsMatchFilter': 'Nessuna opportunità corrisponde a questo filtro.',
      'error': { 'load': 'Impossibile caricare le analisi CRM. Riprova.' }
    },
    'accounts': {
      'pageTitle': 'Account', 'pageSubtitle': 'Tutte le aziende', 'searchPlaceholder': 'Cerca account', 'gridView': 'Vista griglia', 'listView': 'Vista elenco', 'newAccount': 'Nuovo account', 'loading': 'Caricamento account...', 'locationNotSpecified': 'Posizione non specificata', 'opportunities': 'Opportunità', 'contacts': 'Contatti', 'pipeline': 'Pipeline', 'owner': 'Proprietario', 'unassigned': 'Non assegnato', 'noAccountsMatch': 'Nessun account corrisponde alla tua ricerca.', 'company': 'Azienda', 'industry': 'Settore', 'country': 'Paese', 'city': 'Città', 'newAccountTitle': 'Nuovo account', 'companyName': 'Nome azienda *', 'selectIndustry': 'Seleziona settore', 'selectCountry': 'Seleziona paese', 'phone': 'Telefono', 'address': 'Indirizzo', 'website': 'Sito web', 'employees': 'Dipendenti', 'annualRevenue': 'Fatturato annuale', 'accountOwner': 'Proprietario account', 'notes': 'Note', 'cancel': 'Annulla', 'creating': 'Creazione...', 'createAccount': 'Crea account',
      'error': { 'requiredName': 'Il nome dell\'azienda è obbligatorio.', 'unableToComplete': 'Impossibile completare la richiesta.' }
    }
  }
};

@Injectable({ providedIn: 'root' })
export class CrmI18nService {
  private readonly langSubject = new BehaviorSubject<CrmLang>(this.readStoredLang());
  readonly lang$ = this.langSubject.asObservable();

  get currentLang(): CrmLang {
    return this.langSubject.value;
  }

  setLang(lang: CrmLang): void {
    this.langSubject.next(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  t(key: string): string {
    const dict = DICTIONARIES[this.currentLang] ?? DICTIONARIES.en;
    
    if (dict[key] !== undefined && typeof dict[key] === 'string') {
      return dict[key];
    }
    
    const keys = key.split('.');
    let value: any = dict;
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        break;
      }
      value = value[k];
    }
    
    if (value !== undefined && value !== null && typeof value === 'string') {
      return value;
    }
    
    if (this.currentLang !== 'en') {
      return this.tFallback(key, DICTIONARIES.en);
    }
    
    return key;
  }

  private tFallback(key: string, dict: Record<string, any>): string {
    if (dict[key] !== undefined && typeof dict[key] === 'string') {
      return dict[key];
    }
    
    const keys = key.split('.');
    let value: any = dict;
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return key;
      }
      value = value[k];
    }
    
    return (value !== undefined && value !== null && typeof value === 'string') ? value : key;
  }

  /**
   * Traduit les valeurs dynamiques (noms d'étapes, sources, statuts, etc.)
   * qui viennent de la base de données.
   */
  translateDynamic(value: string): string {
    if (!value) return value;
    const translations = DYNAMIC_TRANSLATIONS[value];
    if (translations) {
      return translations[this.currentLang] || translations.en || value;
    }
    return value;
  }

  private readStoredLang(): CrmLang {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'fr' || stored === 'it' || stored === 'en' ? (stored as CrmLang) : 'en';
  }
}