'use strict'

/********************Setup***********************************/
//PLC Addressses

//Addresses are set in process.env:

//Format:
//CURRENT=4184
//ALARM=3
//NETWORK=4174
//VERBOSE=true

require('dotenv').load() //load process environment variables

//Addresses are offsets
const addressDict = {
  'currentFloat'  : process.env.CURRENT, //Holding Register
  'alarm'         : process.env.ALARM, //Coil Read only
  'networkPower'  : process.env.NETWORK  //Coil R/W
}

const verbose = process.env.VERBOSE == 'true'

if (verbose){
  console.log("Running in verbose mode")
}
else{
  console.log("Not running in verbose mode")
}

//Express manages server/client communications
const express = require('express');
const util = require('util');


//start express instance
const app = express();

const bodyParser = require('body-parser') //middleware for handling forms


//serve files from public directory:
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));

//start express web server listening on 8080
app.listen(8080, () => {
  console.log('listening on 8080');
});

//serve the homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
})

//modbus communication via TCP
let modbus = require('jsmodbus')
let net = require('net')
//let socket = new net.Socket()

var socketList = [] //contains IDs, options and net.sockets


function setupSockets(sock_ips){
  console.log("Connecting to n ips:", sock_ips.length)

  //TODO: Error check here if iplist is correct length:

  for (var i = 0; i < sock_ips.length; i++){
    socketList[i] = {}
    socketList[i].id = i
    socketList[i].options = {
      'host': sock_ips[i],
      'port': 502
    }
    socketList[i].socket = new net.Socket()
    socketList[i].client = new modbus.client.TCP(socketList[i].socket)
    //Error logging
    socketList[i].socket.on('error', console.error)
    socketList[i].socket.connect(socketList[i].options)
  }
}

function getClient(id){
  if (id < socketList.length){
    return socketList[id].client
  }
  else{
    throw new Error('No client available')
  }
}

function getAddress(addr){
  var value = addressDict[addr]
  //console.log(value)
  if (value === undefined){
    throw new Error('No address defined')
    return null
  }
  else{
    return value
  }
}


console.log("Setting up sockets...")
var default_iplist = ['192.168.1.103']
setupSockets(default_iplist)
//console.log(setupSockets[0].id, setupSockets[0].options)

//nmap scan uses local machine nmap
const nmap = require('node-nmap')

//scan open modbus ports on local network
var nmapscan = new nmap.NmapScan('192.168.1.*', '-p 502')

var iplist = {}
iplist['ip'] = [] //needed to stringify the json

nmapscan.on('complete', function(data){
  for (var i = 0; i < data.length; i++){
    var host = data[i]
    var out = []
    if (! (host.openPorts === undefined || host.openPorts.length == 0)){
      //Only hosts with open TCP ports
      console.log(host)
      iplist['ip'].push(host.ip)
    }
  }
  console.log(iplist)
  setupSockets(iplist['ip'])
})

nmapscan.on('error', function(error){
  console.log(error)
})



//Allows timeout to be used as async promise
const setTimeoutPromise = util.promisify(setTimeout);

/******************End Setup****************************/

/****************Express functions***********************/

//Scan using nmap
app.get('/scan_ips', async function(req, res, next){
  console.log("Scanning ips")
  try{
    nmapscan.startScan()
    console.log(iplist)
    console.log(nmapscan.scanTime)

    //Wait 4 seconds for nmap to finish
    //Nmap library isn't setup to be used as a single async block
    //This makes it easier to just do one request and wait
    res.json(await setTimeoutPromise(4000).then(() => {
      return iplist
    }))
  }
  catch(err){
    next(err)
  }
})

/*Coils are 000000 to 09999*/
app.get('/readCoil/:id/:address', async function(req, res, next) {
  try{
    //console.log(socketList[req.params.id])
    res.json(await
      //Modbus addresss is one off
      getClient(req.params.id)
        .readCoils(getAddress(req.params.address)-1, 8)
          .then(function (resp){
            //console.log(resp.response) //print to server
            return (resp.response) //return to client
          }).catch(function (err){ //modbus error
            //console.error(arguments)
            throw new Error('Modbus Error');
            return console.log(err)
          })
        )
      }
    catch(err){
      next(err) //return error 500 (lower down function)
    }
})

app.post('/writeCoil/:id/:address/:value', async function(req, res, next) {
  console.log("Writing to coil", req.params.address-1, req.params.value)
  try{
    res.status(201).json(await
      getClient(req.params.id)
      .writeSingleCoil(getAddress(req.params.address)-1, req.params.value === 'true') //
      .then(function (resp) {
        //console.log(resp.response)
        return(resp.response);
      }).catch(function (err) {
        console.error(arguments)
        throw new Error('Modbus Error');
        return console.log(err); //Return error to client
      })
    )
  } catch(err){
    next(err)
  }
})

//Register addresses begin with 4
//This converts 4 bytes to IEEE 754 floating point value
app.get('/readHoldingRegisterFloat/:id/:address', async function(req, res, next){
  //console.log("Reading register: ", req.params.address)
  try{
    res.json(await
      //return floating point -> 8 bytes
      //Holding register is not off by one
      getClient(req.params.id)
      .readHoldingRegisters(getAddress(req.params.address), 2)
        .then(function(resp){

          //IEEE 754 conversion from 4 Bytes to floating point value
          var byteOne = resp.response._body._valuesAsArray[0]
          var byteTwo = resp.response._body._valuesAsArray[1]
          var binaryString = byteOne.toString(2).padStart(16, '0') + byteTwo.toString(2).padStart(16, '0')
          //console.log(binaryString, binaryString.length)
          var binaryArray = binaryString.toString(2).split("") //get binary array
          var sign = binaryArray[0]
          var exponent = -127
          for (var i = 0; i < 8; i++){
            //console.log(binaryArray[i+1])
            exponent += binaryArray[i+1] << (7-i)
          }
          var mantissa = 1.0
          for (var i = 0; i < 23; i++){
            //console.log(binaryArray[i+9])
            mantissa += binaryArray[i+9] * Math.pow(2.0, -1.0*(i+1))
          }
          //console.log("Mantissa", mantissa)
          var value = Math.pow(-1, sign) * Math.pow(2, exponent) * mantissa
          //console.log(value)
          return (value)
        }).catch(function (err){ //modbus error
          //console.error(arguments)
          throw new Error('Modbus Error');
          return console.log(err)
        })
    )
  } catch(err){
    next(err) //return status 500
  }
})

//Send status 500 on next(err)
app.use(function(err, req, res, next) {
  if(verbose){
    console.error(err); //uncomment for verbose error reporting
  }
  res.status(500).json({message: 'an error occurred'})
})
