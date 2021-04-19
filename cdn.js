const ping = require('ping');
const fetch = require('node-fetch');

let CDN_SERVERS = "domain1.org,domain2.com,domain3.com";
const CDN_ORG = "orgdomain.com";
const httpStatusCode = {
    OK: 200,
    NO_CONTENT: 204,
    NO_ACCESSIBLE: 403
};

module.exports = async function select() {
    const cdnServers = CDN_SERVERS.split(',');
    let latencyServers = [];
    let domainFaster;
    let latency;

    // push to `latencyServers` array object that contains {details, latency}
    await Promise.all(cdnServers.map(async server => {
        const absoluteURL = `http://${server}/stat`;
        try {
            const res = await fetch(new URL(absoluteURL));
            if (res.status == httpStatusCode.OK) {
                 try {
                     latency = await ping.promise.probe(server);
                     if (latency.time != 'unknown') {
                        latencyServers.push({details: {serverName: server, show: 0},
                                             latency: latency.time});
                    } 
                 } catch (err) {
                     console.log(err);
                 }            
            }
        } catch (err) {
            console.log(err);
        }
    }));

    // check if cdn server live, if not went to org cdn server
    if (!latencyServers.length) {
        domainFaster = CDN_ORG;
    } else {
        domainFaster = latencyServers[0].details.serverName;
    }
    
    return async function(path) {
        let isSuccessRequest = false;

        for (const [index, server] of latencyServers.entries()) {
            if (!isSuccessRequest) {
                let serverFaster = server.details.serverName;
                let absoluteURL = `http://` + serverFaster.concat(path);
                try {
                    let res = await fetch(new URL(absoluteURL));
                    switch (res.status) {
                        case httpStatusCode.NO_CONTENT: {
                            if (index == latencyServers.length) {
                                serverFaster = CDN_ORG;
                            }
                            break;
                        }
                        case httpStatusCode.NO_ACCESSABILTY: {
                            const elementServerIndex = latencyServers.indexOf(server => 
                                             server.details.serverName == serverFaster);
                            if (latencyServers[elementServerIndex].details.show <= 1) {
                                latencyServers[elementServerIndex].details.show++;
                            } else {
                                CDN_SERVERS.replace(latencyServers[elementServerIndex].details.serverName, '');
                                latencyServers.shift();
                                index--;
                            }
                        
                            break;
                        } 
                        case httpStatusCode.OK: {
                            console.log(`fetch ${path} from ${serverFaster}: example`)
                            isSuccessRequest = true;
                            break;
                        } 
                    }
                } catch(err) {
                    console.log(err);
                }
            }
        }
    }
}