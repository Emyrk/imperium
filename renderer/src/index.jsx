import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import terrain from './samples/terrain1.json';
import samples from './samples/room_replay.json';
import _ from 'lodash';

function arraysToObject(obj) {
    for(var key in obj) {
        if(_.isArray(obj[key])) {
            var result = {};
            for(var i=0; i<obj[key].length; i++) {
                result[i] = obj[key][i];
            }
            obj[key] = result;
        }
    }
}

function applyDiff(objects, diff) {
    for (var id in diff) {
        var objDiff = diff[id];
        var obj = _.find(objects, {_id: id});
        if(obj) {
            if(objDiff !== null) {
                arraysToObject(obj);
                arraysToObject(objDiff);
                obj = _.merge(obj, objDiff, (a,b)=>{
                    if (_.isArray(a) && _.isArray(b)) {
                        return b;
                    }
                });
            }
            else {
                _.remove(objects, {_id: id});
            }
        }
        else if(objDiff) {
            obj = _.cloneDeep(objDiff);
            objects.push(obj);
        }
    }
}

function start() {
    const tests = [
        "E11S53", "E12S53", "E16S59", "E12S51"
    ]

    let name = localStorage.getItem("testname") || tests[0]
    // This is jank, but clear storage if it does not exist.
    try {
        require(`../generated/${name}/terrain.json`)
    } catch(e) {
        localStorage.removeItem("testname")
        name = tests[0]
    }
    let terrain = require(`../generated/${name}/terrain.json`)
    let samples = require(`../generated/${name}/room.json`)


    if(samples.ticks) {
        let newSamples = [], objects = [], users = {};
        for(var i in samples.ticks) {
            applyDiff(objects, samples.ticks[i]);
            objects.forEach(object => {
                if(object.user && !users[object.user]) {
                    users[object.user] = {
                        "_id": object.user,
                        "username": "Screeps"
                    }
                }
            });
            newSamples.push({
                gameTime: +i,
                info: {},
                flags: [],
                visual: "",
                users,
                objects: _.cloneDeep(objects)
            });
        }
        samples = newSamples;
    }


    const select = function(name) {
        // Just reload the window, it's easier.
        localStorage.setItem("testname", name)
        window.location.reload()
    }

    ReactDOM.render(
        <div>
            <App samples={samples} terrain={terrain} />
            <div style={{position:"fixed", bottom:"10%", backgroundColor:"white"}}>
                Rooms <span>  </span>
                {tests.map((name) => {
                    return <button key={name} onClick={() => select(name)}>{name}</button>
                })}
            </div>
        </div>,
        document.getElementById('root'),
    );
}

if (window.nodeRequire !== undefined) {
    // Electron build: loading from transferred data
    const { ipcRenderer } = window.nodeRequire('electron');
    ipcRenderer.on('set-sample-data', (evt, data) => {
        start(terrain, JSON.parse(data));
    });
    ipcRenderer.send('ready');
} else {
    // Web build: loading from hardcoded data
    start(samples);
}
