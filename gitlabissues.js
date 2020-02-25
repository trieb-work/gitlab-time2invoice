const axios = require('axios')
const config = require('./config.json');


//Total Time Closed Issues -> not yet invoiced
//total Time Open issues -> not yet invoiced


async function getIssues(company) {
  axios.defaults.baseURL = 'https://gitlab.com/api/v4/'
  axios.defaults.headers['Accept'] = 'application/json'
  axios.defaults.headers['Content-Type'] = 'application/json'
  axios.defaults.headers['PRIVATE-TOKEN'] = config.common.gitlab_auth_token;

  //Check if company is available in config.json
  if (!config['companies'][company]) {
    alert('ERROR: You entered a wrong companyname which does not exist in config.json. Please enter the command again with a valid companyname!');
    return;
  }
  //Get hourly price for price calculations
  let hourly_price = config['companies'][company].sevdesk_price_per_hour;

  //Extract the companyid from the config.json for the axios url needed for the get-request
  console.log('======= SUMMARY =======');
  let companyid = config['companies'][company].gitlabid.toString();
  console.log('Company: ' + company + '; Extraced id from config: ', companyid);
  console.log('=======================')

  try {

    // Get all employee's user IDs to filter later on
    let employees = await getEmployees(config['common']['groupid'])

    const closevalues = await callGitlab(employees,companyid, hourly_price, 'closed');
    const openvalues = await callGitlab(employees,companyid, hourly_price, 'opened');
   

    console.log('Number of closed issues: ', closevalues.issues.length);
    console.log('Total worked Time CLOSED issues ', closevalues.totalTime.toFixed(2)  + ' h');
    console.log('Total price: ', closevalues.totalPrice.toFixed(2) + ' EUR' );
    console.log('=======================')
    console.log('Number of open issues: ', openvalues.issues.length);
    console.log('Time already worked on OPEN issues: ', openvalues.totalTime.toFixed(2) + ' h');
    console.log('Total price: ', openvalues.totalPrice.toFixed(2) + ' EUR' );
    console.log('=======================')


    // return closed issues only
    return closevalues.issues

  } catch (e) {
    console.log(e);
  }

 
}
exports.getIssues = getIssues;


async function callGitlab(employees,companyid, hourly_price, state) {
 
  try {
    let response = await axios.get(`https://gitlab.com/api/v4/groups/${companyid}/issues?state=${state}&scope=all&per_page=100`);
    let issues = response.data;
    //console.log('Count of closed but not yet invoiced issues: ', issues.length);
    issues = issues.map(i => {
      return {
        iid: i.iid,
        title: i.title,
        description: i.description,
        project_id: i.project_id,
        created_at: i.created_at,
        assignee: i.assignee ? i.assignee.id : undefined,
        time_spend: i.time_stats.total_time_spent,
        state: i.state,
        labels: i.labels
      }
    })
      .filter(i => {
        if (employees.includes(i.assignee) ) return true;
        else {
          if (i.time_spend > 0)
            console.warn("WARNING: time spend but not assigned to our company employees for issue " + i.iid + ' (' + i.title + ')')
          return false;
        }
      })
      .filter(i => !i.labels.includes('invoiced'))


    //Make some calculations to see a overview/Summary and show it in the terminal
    let totalTime = 0
    let totalPrice = 0
    for (i of issues) {
      totalTime += (i.time_spend / 60 / 60)
      totalPrice += ((i.time_spend / 60 / 60) * hourly_price);
      const summary = {
        iid: i.iid,
        title: i.title,
        time: (i.time_spend / 60 / 60).toFixed(2),
        price: ((i.time_spend / 60 / 60) * 55).toFixed(2) + 'EUR',
        assignee: i.assignee
      }
      //console.log(summary);
    }
  
    
    return {issues, totalTime, totalPrice}

    
  } catch (error) {
    console.log('Error getting Issues.', error);
  }
}

// get all of our own Employees in order to filter for them. (users in our gitlab group)
async function getEmployees(groupID){

  try {
    let result = await axios.get(`https://gitlab.com/api/v4/groups/${groupID}/members`)
    result = result.data.map(i => {
      return i.id
    })

    return result
    
  } catch (error) {
    console.error('Error getting the employees:', error)
    process.abort
    
  }


}
