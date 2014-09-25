/**
 * @license AngularMBT 1.0
 * (c) 2014 TestOptimal LLC, http://testoptimal.com
 * 
 * License: MIT
 * 
 * An angular service module to build a model-based test automation suite to 
 * test web applications.
 * 
 * AngularMBT is used to perform client side web application testing by having
 * models built in TestOptimal to send test cases in a series of keyword to execute.  
 * 
 * AngularMBT requires access to TestOptimal server, trial download at:
 *     http://testoptimal.com/downloads
 *     
 * The download package include an example Angular web page that demonstrates the
 * usage of AngularMBT:
 *    http://localhost:8888/Demo_AngularJS/index.html
 * 
 * Below is a list of methods offered by AngularMBT:
 * 
 * 1. AngularMBT.startModel = function (execReq, successCB, errorCB)
 *    starts model execution, model is specified in execReq parameter.
 *    successCB will be called if supplied when model execution is started.
 * 	execReq: {
 * 		modelName: "Demo_RemoteAgent",
 * 		svrURL: "http://localhost:8888",
 * 		statDesc: "my model run" 
 * 	}
 * 	
 * 	successCB (agentID);
 * 	errorCB (returnData);
 * 	
 * 2. AngularMBT.closeModel = function (successCB, errorCB) 
 *    closes current model
 *   
 * 3. AngularMBT.getSummary = function (successCB, errorCB)
 *    retrieves the execution summary of current model execution
 *    
 * 4. AngularMBT.nextCmd = function (cmdCB) 
 *    retrieves the next remote command from the model execution and 
 *    automatically calls cmdCB if specified.
 *    cmdCB (rmtCmd)
 *    rmtCmd: launchAUT(...) - starting the model execution
 *    rmcCmd: $exitAgent(...) - end of model execution
 * 
 * 5. AngularMBT.cmdDone = function (status, result) {
 *    sets the command execution status to be sent back to the model
 *    status: success, fail, error
 *    result: any result string you wish to pass back to the model execution
 */   
angular.module("AngularMBT", []).service ('AngularMBT', function($http) {
	var AngularMBT = { 
			execReq: undefined,
			execSeq: 0,
			successCB: undefined,
			errorCB: undefined,
			cmdCB: undefined,
			lastRmtCmd: {
				action: "",
				status: "",
				result: "",
				receivedTS: undefined
			},
			ModelGraph: "/MbtSvr/GraphModel.html?type=ModelGraph",
			TestCaseGraph: "/MbtSvr/GraphSequence.html?type=SequenceGraph",
			TestCaseMSC: "/MbtSvr/GraphTravMsgSeqChart.html?type=travMSC",
			CoverageGraph: "/MbtSvr/GraphCoverage.html?type=CoverageGraph",
			ExecStatList: "/MbtSvr/app=webrpt&name=Model%20Stats%20List"
		};
	
	// open and execute the model
	AngularMBT.startModel = function (execReq, successCB, errorCB) {
		AngularMBT.execSeq += 1;
		AngularMBT.successCB = successCB;
		AngularMBT.errorCB = errorCB;
		AngularMBT.execReq = execReq;
		if (execReq==undefined || execReq.statDesc==undefined || execReq.statDesc=="") {
			AngularMBT.execReq.statDesc = "AngularAgent_Exec_" + (new Date());
		}
		AngularMBT.execReq.agentID = "";
		var url = AngularMBT.execReq.svrURL + "/MbtSvr/app=client&action=exec&async=true&autoClose=false&model=" 
			+ encodeURIComponent(AngularMBT.execReq.modelName) + "&statDesc=" + encodeURIComponent(AngularMBT.execReq.statDesc);
		AngularMBT.getURL(url, function() {
			setTimeout (AngularMBT.getAgentID, AngularMBT.execReq.modelStartWait);
		});
	};

	// stop model execution
	AngularMBT.stopModel = function (successCB, errorCB) {
		var url = AngularMBT.execReq.svrURL + "/MbtSvr/app=client&action=stop&model=" 
			+ encodeURIComponent(AngularMBT.execReq.modelName);
		AngularMBT.getURL(url, successCB, errorCB);
	};

	// close the model
	AngularMBT.closeModel = function (successCB, errorCB) {
		var url = AngularMBT.execReq.svrURL + "/MbtSvr/app=client&action=close&model=" 
			+ encodeURIComponent(AngularMBT.execReq.modelName);
		AngularMBT.getURL(url, successCB, errorCB);
	};

	// retrieve execution summary
	AngularMBT.getSummary = function (successCB, errorCB) {
		var url = AngularMBT.execReq.svrURL + "/MbtSvr/app=client&action=summary";
		AngularMBT.getURL(url, successCB, errorCB);
	};

	AngularMBT.getAgentID = function () {
		var url = AngularMBT.execReq.svrURL + "/MbtSvr/app=agentsvc&action=regAgent&mbtFile=" + encodeURIComponent(AngularMBT.execReq.modelName);
		AngularMBT.getURL(url, function(returnData) {
				AngularMBT.execReq.agentId = returnData;
				if (AngularMBT.successCB) AngularMBT.successCB(returnData);
			}, 
			AngularMBT.errorCB);
	};

	// retrieve next command from the model execution
	AngularMBT.nextCmd = function (cmdCB) {
		if (cmdCB) {
			AngularMBT.cmdCB = cmdCB;
		}
		var nextCmdURL = AngularMBT.execReq.svrURL + "/MbtSvr/app=agentsvc&action=nextCmd&agentID=" 
			+ AngularMBT.execReq.agentId + "&status=" + AngularMBT.lastRmtCmd.status + "&result=" + encodeURIComponent(AngularMBT.lastRmtCmd.result);
		AngularMBT.getURL (nextCmdURL, function(returnData) {
			if (returnData!="") {
				AngularMBT.lastRmtCmd = {
						action: returnData,
						status: "",
						result: "",
						receivedTS: new Date()
				};
				
				if (AngularMBT.cmdCB) {
					setTimeout (function() {AngularMBT.cmdCB(AngularMBT.lastRmtCmd);}, 50);
				}
			}
		});
	};

	// sets the command execution status to be sent back to the model
	AngularMBT.cmdDone = function (status, result) {
		AngularMBT.lastRmtCmd.status = status;
		AngularMBT.lastRmtCmd.result = result;
	}

	AngularMBT.getURL = function (url, successCB, errorCB) {
		if (AngularMBT.execReq.debug) AngularMBT.addMsg("sending: " + url);
		$http.get(url)
			.success(function(returnData, status) {
				if (successCB) successCB(returnData);
			})
			.error(function(returnData, status) {
				if (errorCB) errorCB(returnData);
			});
	};

	AngularMBT.addMsg = function (msg) {
		if (AngularMBT.execReq.msgList) {
			AngularMBT.execReq.msgList.push(msg);
			AngularMBT.purgeMsgList();
		}
	}
	
	AngularMBT.purgeMsgList = function () {
		if (AngularMBT.execReq && AngularMBT.execReq.msgMax>0) {
			AngularMBT.execReq.msgList.splice(0,AngularMBT.execReq.msgList.length-AngularMBT.execReq.msgMax);
		}
	}

	return AngularMBT;
});

