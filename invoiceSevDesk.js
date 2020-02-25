const axios = require('axios')
const qs = require('qs');
const gitlabissues = require('./gitlabissues');
const config = require('./config.json');

async function invoiceIssues(company) {
  let comp = config.companies[company];
 
  
  //Get closed but not yet invoiced issues
  let issues =  await gitlabissues.getIssues(company); //returns only the closedIssues
 

  //create invoice in SevDesk
  body = {
    "invoice[contact][id]": `${comp.sevdesk_id}`,
    "invoice[contact][objectName]": "Contact",
    "invoice[invoiceDate]": (Date.now()).toString().substring(0, 10),
    "invoice[header]": "Stundenabrechnung vom " + (new Date()).toDateString(),
    "invoice[headText]": config.common.sevdesk_header_text,
    "invoice[footText]": "Danke für Ihr Vertrauen! Überweisung bitte mit Rechnungsnummer als Buchungsreferenz.",
    "invoice[timeToPay]": "14",
    "invoice[discount]": "0",
    "invoice[addressName]": `${comp.sevdesk_adress_name}`,
    "invoice[addressCountry][id]": "1",
    "invoice[addressCountry][objectName]": "StaticCountry",
    "invoice[status]": "100",
    "invoice[contactPerson][id]": config.common.sevdesk_internal_contact_person,   
    "invoice[contactPerson][objectName]": "SevUser",
    "invoice[taxRate]": "0",
    "invoice[taxText]": "0",
    "invoice[taxType]": "default",
    "invoice[invoiceType]": "RE",
    "invoice[address]": `${comp.sevdesk_adress}`,
    "invoice[currency]": "EUR",
    "invoice[objectName]": "Invoice",
    "invoice[types]": "[object Object]",
    "invoice[mapAll]": "true"
  }

  body = issues.reduce((obj, issue, i) => {
    obj['invoicePosSave[' + i + '][quantity]'] = (issue.time_spend / 60 / 60).toFixed(2).toString()
    obj['invoicePosSave[' + i + '][price]'] = `${comp.sevdesk_price_per_hour}`
    obj['invoicePosSave[' + i + '][name]'] = issue.title
    obj['invoicePosSave[' + i + '][unity][id]'] = '9'
    obj['invoicePosSave[' + i + '][unity][objectName]'] = 'Unity'
    obj['invoicePosSave[' + i + '][positionNumber]'] = (i).toString()
    obj['invoicePosSave[' + i + '][text]'] = 'IssueID: ' + issue.iid + '\nBeschreibung: ' + issue.description ? issue.description : 'Keine'
    obj['invoicePosSave[' + i + '][taxRate]'] = '19'
    obj['invoicePosSave[' + i + '][priceNet]'] = '27'
    obj['invoicePosSave[' + i + '][objectName]'] = 'InvoicePos'
    obj['invoicePosSave[' + i + '][mapAll]'] = 'true'
    return obj
  }, body);

  axios.defaults.baseURL = 'https://my.sevdesk.de/api/v1'
  axios.defaults.headers['Accept'] = 'application/json'
  axios.defaults.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  axios.defaults.headers['Authorization'] = config.common.sevdesk_auth_token
  axios.defaults.headers['Cache-Control'] = 'no-cache'

  // change to our trieb.work rendering template
  if(config.common.sevdesk_invoice_template_id){
    try {
      await axios.post('/DocServer/setDefaultTemplate', qs.stringify({
        id: config.common.sevdesk_invoice_template_id,
        type: 'Invoice'
      }))
    } catch (error) {
      console.log('Error changing rendering template', error)
    }

  }
  

  // create the invoice draft in SevDesk
  try {
    res = await axios.post('/Invoice/Factory/saveInvoice', qs.stringify(body))
    console.log("created invoice id "+res.data.objects.invoice.id);
  } catch (error) {
    console.log('Error create invoice in SevDesk', error)

  }

  axios.defaults.baseURL = 'https://gitlab.com/api/v4/projects/'
  axios.defaults.headers['Accept'] = 'application/json'
  axios.defaults.headers['Content-Type'] = 'application/json'
  axios.defaults.headers['PRIVATE-TOKEN'] = config.common.gitlab_auth_token
  
  // Relabel every relevant gitlab issues to not be invoiced again
  for ( i of issues) {
    try {
      i.labels.push('invoiced')
      res = await axios.put(i.project_id + '/issues/' + i.iid + '?labels=' + i.labels.join(','))
      console.log('Relabeled issue', i.title)
    } catch (error) {
      console.error('Error relabeling issues', error)
    }

  }

}
exports.invoiceIssues = invoiceIssues;