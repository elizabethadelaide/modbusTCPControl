console.log("Running client js code");

/*****************Functions:**********************/
//Functions are laid out in index.js as express.js functions


/*
Post commands are just sent and forgotten
*/
function doPost(cmd){
  //console.log(cmd);
  fetch(cmd, {method: 'POST'})
    .then(function(response){
      if (response.ok){
        console.log("Did post cmd: ", cmd);
        return;
      }
      throw new Error('Request failed: ' + cmd);
    })
    .catch(function(error){
      //console.log(error);
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

*/
function doGet(cmd){

  return new Promise(mydata => {
    fetch(cmd, {method: 'GET'})
    .then(function(response){
      if (response.ok) return response.json();
      throw new Error('request failed: ' + cmd);
    })
    .then(function(data){
      //console.log(data._valuesAsArray._body);
      return mydata(data);
    })
    .catch(function(error){
      //console.log(error);
      mydata(undefined);
    });
  })
}
/***********/

const myTimeInterval = 500; //timing of requests
const reversePowerSwitch = true;

setupMonitor('plcCurrentZero', 0);
setupMonitor('plcCurrentOne', 1);
setupMonitor('plcCurrentTwo', 2);
setupMonitor('plcCurrentThree', 3);
setupMonitor('plcCurrentFour', 4);
setupMonitor('plcCurrentFive', 5);
setupMonitor('plcCurrentSix', 6);
setupMonitor('plcCurrentSeven', 7);
setupMonitor('plcCurrentEight', 8);
setupMonitor('plcCurrentNine', 9);

setIp('plcNameZero', 0);
setIp('plcNameOne', 1);
setIp('plcNameTwo', 2);
setIp('plcNameThree', 3);
setIp('plcNameFour', 4);
setIp('plcNameFive', 5);
setIp('plcNameSix', 6);
setIp('plcNameSeven', 7);
setIp('plcNameEight', 8);
setIp('plcNameNine', 9);

setupPowerControl('buttonPowerZero', 0);
setupPowerControl('buttonPowerOne', 1);
setupPowerControl('buttonPowerTwo', 2);
setupPowerControl('buttonPowerThree', 3);
setupPowerControl('buttonPowerFour', 4);
setupPowerControl('buttonPowerFive', 5);
setupPowerControl('buttonPowerSix', 6);
setupPowerControl('buttonPowerSeven', 7);
setupPowerControl('buttonPowerEight', 8);
setupPowerControl('buttonPowerNine', 9);

temperatureMonitor('plcTemperatureZero', 0);

function setIp(elementName, id){
  setInterval(async function(){
    ipCmd = 'getIp/' + id;
    ip = await doGet(ipCmd);
    if (ip == -1 || ip === undefined){
      document.getElementById(elementName).innerHTML = "PLC " + (id + 1);
    }
    else{
      plcText = "PLC " + (id + 1) + " @ " + ip;
      document.getElementById(elementName).innerHTML = plcText;
    }
  }, 4000);
}

//Monitor PLC status
function setupMonitor(elementName, id){


  setInterval(async function(){

    //Can put this all into one JSON request
    dataCmd = 'readHoldingRegisterFloat/' + id + '/currentFloat';

    currentData = await doGet(dataCmd)

    //console.log("Received current Data:", currentData);

    if (currentData == -1 || currentData === undefined){
      document.getElementById(elementName).innerHTML = 'Error connecting to PLC';
    }
    else{
      alarmCmd = 'readCoil/' + id + '/alarm';
      alarm = await doGet(alarmCmd);

      //console.log(alarm)

      var AC_ALARM = alarm._body._valuesAsArray[0];
      var FAN_ALARM = alarm._body._valuesAsArray[1];
      var OTP_ALARM = alarm._body._valuesAsArray[2];

      if (AC_ALARM == 1){
        document.getElementById(elementName).innerHTML = "Error: AC Alarm";
      }
      else if (FAN_ALARM == 1){
        document.getElementById(elementName).innerHTML = "Error: Fan Alarm";
      }
      else if (OTP_ALARM == 1){
        document.getElementById(elementName).innerHTML = "Error: OTP Alarm";
      }
      else{
        //console.log(bits)
        document.getElementById(elementName).innerHTML = currentData.toFixed(3) + ' A';
      }
    }
  }, myTimeInterval);
}

function powerText(value){
  if (value == 1){
    if (reversePowerSwitch){
      return 'Current Power Status: <span class="textoff">Off</span>';
    }
    else{
      return 'Current Power Status: <span class="texton">On</span>';
    }
  }
  else{
    if (reversePowerSwitch){
      return 'Current Power Status: <span class="texton">On</span>';
    }
    else{
      return 'Current Power Status: <span class="textoff">Off</span>';
    }
  }
}

function setupPowerControl(elementName, id){
  const myButton = document.getElementById(elementName);

  //Check power register occasionally
  setInterval(async function(){
    var readCmd = '/readCoil/' + id + '/networkPower/';
    await doGet(readCmd)
      .then(async function(data){
        currentValue = data._body._valuesAsArray[0];
        newText = powerText(currentValue)
        document.getElementById(elementName).innerHTML = newText;
    }).catch(function(err){
      document.getElementById(elementName).innerHTML = 'Error connecting to PLC';
    })
  }
  , 1000)

  myButton.addEventListener('click', async function(e){
    var readCmd = '/readCoil/' + id + '/networkPower/';
    await doGet(readCmd)
    .then(async function(data){
      if (data === undefined){
        throw new Error("No connection to PLC");
      }
      currentValue = data._body._valuesAsArray[0];
      //console.log(data, currentValue);
      if (reversePowerSwitch){
        checkValue = 1 - currentValue;
      }
      if (checkValue === 1){
        var prompt = "Power off PLC # " + (id + 1) + "?"
      }
      else if (checkValue === 0){
        var prompt = "Power on PLC # " + (id + 1) + "?"
      }
      else{
        window.alert("No connection to PLC!");
        return -1;
      }
      if (window.confirm(prompt)){
        if (currentValue == 1){
          newValue = 'false';
        }
        else{
          newValue = 'true';
        }
        newText = powerText(currentValue);
        var pwrCmd = '/writeCoil/' + id + '/networkPower/' + newValue;
        await doPost(pwrCmd)
        document.getElementById(elementName).innerHTML = newText;
      }
    })
    .catch(function (err){
      console.log(err);
    })
  })
}

//For monitoring thermocouple status
function temperatureMonitor(elementName, id){
  setInterval(async function(){
    tempOneCmd = 'readHoldingRegisterFloat/' + id + '/tempOne';
    tempTwoCmd = 'readHoldingRegisterFloat/' + id + '/tempTwo';

    tempOne = await doGet(tempOneCmd);

    if (tempOne == -1  || tempOne === undefined){
      document.getElementById(elementName).innerHTML = "Error connecting to PLC";
    }
    else{
      tempTwo = await doGet(tempTwoCmd);
      stringTempOne = "<h2>Temp One: " + tempOne.toFixed(3) + "&deg;F</h2>";
      stringTempTwo = "<h2>Temp Two: " + tempTwo.toFixed(3) + "&deg;F</h2>";
      document.getElementById(elementName).innerHTML = stringTempOne + stringTempTwo;
    }
  }, 2000);
}

//Get PLCs on network

const networkCheckButton = document.getElementById('buttonNetworkCheck')

networkCheckButton.addEventListener('click', async function(e){
  console.log('Scanning network')
  document.getElementById('iplist').innerHTML = 'Scanning network'

  data = await doGet('/scan_ips')
  document.getElementById('iplist').innerHTML = 'Available Ips: <br>' + data.ip.toString().replace(/,/g, "<br>");
})
