console.log("Running client js code");

//TODO:
/*
Nicer function constructor

with dictionary of addresses

function names etc.

May be like best on server...
*/


/*****************Functions:**********************/
//Functions are laid out in index.js as express.js functions


/*
Post commands are just sent and forgotten
*/
function doPost(cmd){
  fetch(cmd, {method: 'POST'})
    .then(function(response){
      if (response.ok){
        //console.log("Did post cmd: ", cmd);
        return;
      }
      throw new Error('Request failed');
    })
    .catch(function(error){
      console.log(error);
      return -1;
    })
}

/*
GET commands need to be async

So they return promise because they have to wait for server async task
Any function that uses GET, (watcher) needs to use format:

myFunction(async function(){
  outputData = await doGet('readWhatever/address')

  ....use data here....
})

Could write a wrapper around it also later...
*/
function doGet(cmd){

  return new Promise(mydata => {
    fetch(cmd, {method: 'GET'})
    .then(function(response){
      if (response.ok) return response.json();
      throw new Error('request failed');
    })
    .then(function(data){
      //console.log(data._valuesAsArray._body);
      return mydata(data);
    })
    .catch(function(error){
      console.log(error);
      return -1;
    });
  })
}
/***********/

setupMonitor('plcCurrentZero', 0);
/*setupMonitor('plcCurrentOne', 1);
setupMonitor('plcCurrentTwo', 2);
setupMonitor('plcCurrentThree', 3);
setupMonitor('plcCurrentFour', 4);
setupMonitor('plcCurrentFive', 5);
setupMonitor('plcCurrentSix', 6);
setupMonitor('plcCurrentSeven', 7);
setupMonitor('plcCurrentEight', 8);
setupMonitor('plcCurrentNine', 9);*/

setupPowerControl('buttonPowerZero', 0);
setupPowerControl('buttonPowerOne', 1)
/*setupPowerControl('buttonPowerTwo', 2)
setupPowerControl('buttonPowerThree', 3)
setupPowerControl('buttonPowerFour', 4)
setupPowerControl('buttonPowerFive', 5)
setupPowerControl('buttonPowerSix', 6)
setupPowerControl('buttonPowerSeven', 7)
setupPowerControl('buttonPowerEight', 8)
setupPowerControl('buttonPowerNine', 9)*/


//Monitor PLC status
function setupMonitor(elementName, id){

  setInterval(async function(){

    //Can put this all into one JSON request
    dataCmd = 'readHoldingRegisterFloat/' + id + '/currentFloat';

    currentData = await doGet(dataCmd);

    //console.log(data._body._valuesAsArray);

    if (currentData == -1 || currentData === undefined){
      document.getElementById(elementName).innerHTML = 'Response: Error connecting to PLC';
    }
    else{
      alarmCmd = 'readCoil/' + id + '/alarm';
      alarm = await doGet(alarmCmd);

      //console.log(alarm)

      var AC_ALARM = alarm._body._valuesAsArray[0];
      var FAN_ALARM = alarm._body._valuesAsArray[1];
      var OTP_ALARM = alarm._body._valuesAsArray[2];

      if (AC_ALARM === 1){
        document.getElementById(elementName).innerHTML = "Error: AC Alarm";
      }
      else if (FAN_ALARM === 1){
        document.getElementById(elementName).innerHTML = "Error: Fan Alarm";
      }
      else if (OTP_ALARM === 1){
        document.getElementById(elementName).innerHTML = "Error: OTP Alarm";
      }
      else{
        //console.log(bits)
        document.getElementById(elementName).innerHTML = currentData.toString().substring(0, 6) + ' A';
      }
    }
  },500);
}

function setupPowerControl(elementName, id){
  const myButton = document.getElementById(elementName);

  myButton.addEventListener('click', async function(e){
    var readCmd = '/readCoil/' + id + '/networkPower/';
    await doGet(readCmd)
    .then(async function(data){
      currentValue = data._body._valuesAsArray[0];
      console.log(data, currentValue);
      if (currentValue === 1){
        var p//Monitor PLC status
/*setInterval(async function(){
  data = await doGet('/readCoil/0/8194')

  //console.log(data._body._valuesAsArray);

  if (data == -1 || data === undefined){
    document.getElementById('plcNetworkOn').innerHTML = 'Response: Error connecting to PLC';
  }
  else{
    bit = data._body._valuesAsArray[0];
    document.getElementById('plcNetworkOn').innerHTML = 'Network Control: ' + bit;
  }
}, 500);*/rompt = "Power off PLC # " + (id + 1) + "?"
      }
      else if (currentValue === 0){
        var prompt = "Power on PLC # " + (id + 1) + "?"
      }
      else{
        window.alert("No connection to PLC!");
        return -1;
      }
      if (window.confirm(prompt)){
        if (currentValue === 1){
          newValue = 'false';
          newText = 'Turn On';
        }
        else{
          newValue = 'true';
          newText = 'Turn Off';
        }
        var pwrCmd = '/writeCoil/' + id + '/networkPower/' + newValue;
        await doPost(pwrCmd)
        document.getElementById(elementName).innerHTML = newText;
      }
    }).then(doPost)
  })
}

//Get PLCs on network
const networkCheckButton = document.getElementById('buttonNetworkCheck')

networkCheckButton.addEventListener('click', async function(e){
  console.log('Scanning network')
  document.getElementById('iplist').innerHTML = 'Scanning network'

  data = await doGet('/scan_ips')
  document.getElementById('iplist').innerHTML = 'Available Ips: ' + data.ip;
})
