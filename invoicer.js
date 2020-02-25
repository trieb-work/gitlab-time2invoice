//Thats where all is configured and decided if invoicing is made
//by using the CLI arguments with flags

const yargs = require('yargs');
const gitlabissues = require('./gitlabissues');
const invoiceSevDesk = require('./invoiceSevDesk');
var prompt = require('prompt');
 

const argv = yargs
    .command('issues', 'Invoice all closed but not yet invoiced issues', {
        company: {
            description: 'the company/gitlab group issues should be invoiced for',
            alias: 'c',
        },  
    })
    .option('invoice', {
        alias: 'i',
        description: 'set this option if invoicing is requested',
    })
    .help().alias('help', 'h')
    .argv;

if (argv._.includes('issues')) {
    //ONLY CHECKING NO INVOICING
    if(!argv.invoice) {
        if (argv.company){
            gitlabissues.getIssues(argv.company);
        } else {
            //TODO: What happens when no company is entered as parameter?
        }
    } else {  //INVOICING ISSUES
        console.log('Invcoicing requested for:');
        console.log('company: ', argv.company);
        prompt.message = `Do you really want the issues from ${argv.company} now? (y/n)`;
        prompt.start();
        prompt.get(['answer'], function (err, result) {
            if (err) {
                console.log("Error", err);
            }
            if (result.answer == 'n') {
                console.log('You said no or there was an error. Please try again.')
            } else if (result.answer == 'y') {
                //invoiceSevDesk.invoiceIssues(argv.company);
                console.log('Invoicing.....');
                invoiceSevDesk.invoiceIssues(argv.company)
            }  else {
                console.log('you did not enter either "n" or "y"');
            }
          });
        
        
        
    }   
}



