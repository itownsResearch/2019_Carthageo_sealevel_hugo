import * as itowns from 'itowns'
import GuiTools from './gui/GuiTools'
import {
    ToolTip
} from './utils/FeatureToolTip'

import binarySearch from './utils/search'
import {
    createLinks
} from './utils/scenario'
import mairies from '../data/mairies'
import scenario from '../data/scenar.js'

import * as THREE from 'three'; // We need THREE (no more exposed by itowns?)

import IGN_MNT_HR from './layers/IGN_MNT_HIGHRES'
import IGN_MNT from './layers/IGN_MNT'
import DARK from './layers/DARK'
import Ortho from './layers/Ortho'
import Slopes from './layers/slopesImage'
import {
    iso_1_config,
    iso_5_config
} from './layers/isolines'
import iso_1 from './layers/iso_1'
import iso_5 from './layers/iso_5'
import WORLD_DTM from './layers/WORLD_DTM'
import {
    bati,
    shadMat
} from './layers/bati'
import {
    batiRem,
    shadMatRem
} from './layers/bati_remarquable'


// around Bordeaux
let positionOnGlobe = {
    longitude: -0.525,
    latitude: 44.85,
    altitude: 250
};
let coords = {
    lon: -0.650,
    lat: 44.905,
    deltaLon: 0.160,
    deltaLat: -0.110
};
// île de Ré
positionOnGlobe = {
    longitude: -1.440376,
    latitude: 46.222186,
    altitude: 3000
};
coords = {
    lon: -1.563,
    lat: 46.19482,
    deltaLon: 0.300,
    deltaLat: -0.150
};

const viewerDiv = document.getElementById('viewerDiv');
const htmlInfo = document.getElementById('info');
const boardInfo = document.getElementById('boardSpace');

// Options for segments in particular is not well handled
// We modified some code in itowns and created an issue https://github.com/iTowns/itowns/issues/910
let options = {
    segments: 128
}; // We specify a more refined tile geomtry than default 16*16
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, options);
const menuGlobe = new GuiTools('menuDiv', globeView)

// I have to call it twice to make it works, even if i destroy the result immediately, don't ask why..



let liness = createLinks(scenario);
liness = null;


// the last line described in the json is just added to make it work, we won't add it to the scene, strange hack..

const lines = createLinks(scenario);
lines.pop();

function addtoscene(lines) {
    for (let i = 0; i < lines.length; ++i) {
        globeView.scene.add(lines[i]);
    }
}

function adjustAltitude(value) {
    // A.D Here we specify the Z displacement for the water
    var displacement = value;
    globeView.setDisplacementZ(displacement);
    globeView.notifyChange();

}

// Set water representation mode in shaders
function setMode(value) {
    var v = parseInt(value);
    globeView.updateMaterialUniformMode(v);
    globeView.notifyChange();
}

//passing value to the buildings shaders
function adjustBuildingColors(value) {
    shadMat.uniforms.waterLevel.value = value;
    shadMatRem.uniforms.waterLevel.value = value;
}

//changing visibility of lines according to the scenario
function setLinesVisibility(lines, value) {
    for (let i = 0; i < lines.length; ++i) {
        lines[i].visible = (value >= scenario.links[i].hauteur_dysf);
    }
}

globeView.addLayer(Ortho);
//globeView.addLayer(Slopes);
globeView.addLayer(DARK);
globeView.addLayer(WORLD_DTM);
globeView.addLayer(IGN_MNT_HR);
globeView.addLayer(bati);
globeView.addLayer(batiRem);
globeView.addLayer(iso_1)
globeView.addLayer(iso_5)
//globeView.addLayer(iso_1_config);
//globeView.addLayer(iso_5_config);



const irisLayer = {
    type: 'color',
    id: 'iris',
    name: 'iris',
    transparent: true,
    style: {
        fill: 'orange',
        fillOpacity: 0.01,
        stroke: 'white',
    },
    source: {
        url: 'data/iris.geojson',
        protocol: 'file',
        projection: 'EPSG:4326',
    },
    visible: false
};
globeView.addLayer(irisLayer);
//Create the source
// const tmsSource = new itowns.TMSSource(iso_4);

// const colorLayer = new itowns.ColorLayer('iso_4', {
//     source: tmsSource,
// });


/*************************************** WATER A.D ***********************************************/
// Here we create the Tile geometry for the water using a globe with specific vertex displacement
let object3d = new THREE.Object3D();
let segments = 64;
const globeWater = itowns.createGlobeLayer('globeWater', {
    object3d,
    segments
});
globeWater.disableSkirt = true;
globeWater.opacity = 0.7; // So we can handle transparency check for nice shading
// We can maybe specify a more refined geometry for the water using segments option
// But as the we represent the water as flat (no wave, ellipsoid like) we can keep a light geomtry
// globe2.noTextureColor = new itowns.THREE.Color(0xd0d5d8);

// add globeWater to the view so it gets updated
itowns.View.prototype.addLayer.call(globeView, globeWater);
//globeWater.addLayer(IGN_MNT_HR);
//itowns.View.prototype.addLayer.call(globeView, IGN_MNT_HR, globeWater);

// UGLY WAY. NEED TO REUSE IGN_MNT_HR  (TODO: check already used ID problem)
// We give the water the information of the ground to make some rendering
// using water height and other stuff
// DONE, we change the ID, it should use the itowns cache so we share the data between globe and water
IGN_MNT_HR.id = 'HR_DTM_forWater';
itowns.View.prototype.addLayer.call(globeView, IGN_MNT_HR, globeWater);
// Ortho.id = 'Ortho_forWater';
// itowns.View.prototype.addLayer.call(globeView, Ortho, globeWater);
/* itowns.Fetcher.json('src/layers/IGN_MNS_HIGHRES.json').then(function _(litto3D) {
     //worldDTM.id = 'toto';
     itowns.View.prototype.addLayer.call(globeView, litto3D, globeWater);
 });
 */

/*
itowns.Fetcher.json('./layers/JSONLayers/OPENSM.json').then(function _(osm) {
    itowns.View.prototype.addLayer.call(globeView, osm, globeWater);
});
*/
/**************************************************************************************************/

let time = 0;
let time2 = 0;
var lev = 0;
let currentWaterLevel = {
    val: 0
};
var lev;
globeView.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
    globeView.controls.minDistance = 50; // Allows the camera to get closer to the ground
    console.log('globe initialized ?', globeView);
    //addtoscene(lines);

    menuGlobe.addImageryLayersGUI(globeView.getLayers(l => l.type === 'color'));
    menuGlobe.addGeometryLayersGUI(globeView.getLayers(l => l.type === 'geometry' && l.id != 'globe'));
	let watermenu = menuGlobe.gui.addFolder('Water Layers');
    watermenu.add({
        HauteurdEau: 0.1
    }, 'HauteurdEau').min(0.1).max(9).onChange((
        function updateWaterLevel(value) {
            adjustAltitude(value);
            adjustBuildingColors(value);
            //setLinesVisibility(lines, value);
            //changeBoardInfos(value);
            currentWaterLevel.val = value;
            globeView.notifyChange(true);
        }));

    watermenu.add({
        Niveaux: false
    }, 'Niveaux').onChange(function updateWaterLevel(value) {
        setMode(value ? 1 : 0);
        var legende = document.getElementById("batchLegende");
    });



    watermenu.add({
        TransparenceEau: false
    }, 'TransparenceEau').onChange(function updateWaterLevel(value) {
        globeWater.opacity = value ? 0.4 : 0.7;
        globeView.notifyChange();
    });
    watermenu.add({
        Scenario1: false
    }, 'Scenario1').onChange((
        function updateWaterLevel_animated() {

            lev = 0;
			document.getElementsByTagName("input")[27].checked = true;
            var id = setInterval(frame, 10);
            document.getElementsByClassName("slider-fg")[8].style.width = "0%"; //change the value of the slider at the beggining of the scenario 
            document.getElementsByTagName("input")[24].value = "0.1"; //change the value at the beggining of the scenario 
            document.getElementsByTagName("input")[28].checked = false; //scenario2  false
            document.getElementsByTagName("input")[29].checked = false; //scenario3  false

            function frame() {
                if (document.getElementsByTagName("input")[27].checked == true){
                    if (lev > 5.0) { //end of the scenario
                        adjustAltitude(5);
                        adjustBuildingColors(5);
                        //setLinesVisibility(lines, 5);
                        document.getElementsByClassName("slider-fg")[8].style.width = "55.56%"; //change the value of the slider at the end of the scenario 
                        document.getElementsByTagName("input")[24].value = "5"; //change the value at the end of the scenario 
                        //changeBoardInfos(5);
                        //currentWaterLevel.val = 5;
                        globeView.notifyChange(true);
                        clearInterval(id);
                    } else {
                        lev += 0.002;
                        adjustAltitude(lev);
                        adjustBuildingColors(lev);
                        //setLinesVisibility(lines, lev);
                        //changeBoardInfos(lev);
                        currentWaterLevel.val = lev;
                        globeView.notifyChange(true);
                    }
                }

            }
        }));
    watermenu.add({
        Scenario2: false
    }, 'Scenario2').onChange((
        function updateWaterLevel_animated() {

            lev = 0;
			document.getElementsByTagName("input")[28].checked = true;
            var id = setInterval(frame, 10);
            document.getElementsByClassName("slider-fg")[8].style.width = "0%"; //change the value of the slider at the beggining of the scenario 
            document.getElementsByTagName("input")[24].value = "0.1"; // //change the value at the beggining of the scenario 
            document.getElementsByTagName("input")[27].checked = false; //scenario1 false
            document.getElementsByTagName("input")[29].checked = false; //scenario3 false

            function frame() {
                if (document.getElementsByTagName("input")[28].checked == true) {
                    if (lev > 7.0) { //end of the scenario
                        adjustAltitude(7);
                        adjustBuildingColors(7);
                        //setLinesVisibility(lines, 7);
                        document.getElementsByClassName("slider-fg")[8].style.width = "77.78%"; //change the value of the slider at the end of the scenario 
                        document.getElementsByTagName("input")[24].value = "7"; //change the value at the end of the scenario 
                        //changeBoardInfos(7);
                        //currentWaterLevel.val = 7;
                        globeView.notifyChange(true);
                        clearInterval(id);
                    } else {
                        lev += 0.002;
                        adjustAltitude(lev);
                        adjustBuildingColors(lev);
                        //setLinesVisibility(lines, lev);
                        //changeBoardInfos(lev);
                        currentWaterLevel.val = lev;
                        globeView.notifyChange(true);
                    }
                }

            }
        }));    watermenu.add({
        Scenario3: false
    }, 'Scenario3').onChange((
        function updateWaterLevel_animated() {

            lev = 0;
			document.getElementsByTagName("input")[29].checked = true;
            var id = setInterval(frame, 10);
            document.getElementsByClassName("slider-fg")[8].style.width = "0%"; //change the value of the slider at the beggining of the scenario 
            document.getElementsByTagName("input")[24].value = "0.1"; //change the value at the beggining of the scenario
            document.getElementsByTagName("input")[27].checked = false; //scenario1 false
            document.getElementsByTagName("input")[28].checked = false; //scenario2 false

            function frame() {
                if (document.getElementsByTagName("input")[29].checked == true) {
                    if (lev > 9.0) { //end of the scenario
                        adjustAltitude(9);
                        adjustBuildingColors(9);
                        //setLinesVisibility(lines, 9);
                        document.getElementsByClassName("slider-fg")[8].style.width = "100%"; //change the value of the slider at the end of the scenario
                        document.getElementsByTagName("input")[24].value = "9"; //change the value at the end of the scenario
                        //changeBoardInfos(6);
                        //currentWaterLevel.val = 6;
                        globeView.notifyChange(true);
                        clearInterval(id);
                    } else {
                        lev += 0.002; //increment waterlevel
                        adjustAltitude(lev);
                        adjustBuildingColors(lev);
                        //setLinesVisibility(lines, lev);
                        //changeBoardInfos(lev);
                        currentWaterLevel.val = lev;
                        globeView.notifyChange(true);
                    }
                }

            }
        }));
		/*
		watermenu.add({
        Abstraction: true
    }, 'Abstraction').onChange(function updateWaterLevel(value) {
		console.log("play/pause")
		});
		*/
		menuGlobe.gui.add({
        Abstraction: true
    }, 'Abstraction').onChange(function updateWaterLevel(value) {
		if(document.getElementsByTagName("input")[30].checked == true){
			document.getElementsByClassName("property-name")[30].innerHTML = "Style Abstrait";
		}
		else{
			document.getElementsByClassName("property-name")[30].innerHTML = "Style Topo";
		}
        var layer = globeView.getLayers(l => l.id === 'DARK')[0];
        layer.opacity = value ? 1 : 0;
        globeView.notifyChange(layer);
    });
	
	


		/*
    menuGlobe.gui.add({
        Lines: false
    }, 'Lines').onChange((
        function lines_animated() {
			addtoscene(lines)
            setLinesVisibility(lines, lev);
            animateLines();
			//animateColor();
        }));
		*/
	/*
	Rename the buttons
	*/
	menuGlobe.gui.domElement.getElementsByTagName("span")[24].innerHTML = "Hauteur d'eau";
	menuGlobe.gui.domElement.getElementsByTagName("span")[30].innerHTML = "Style Abstrait";
	menuGlobe.gui.domElement.getElementsByTagName("span")[26].innerHTML = "Eau transparente";
	//menuGlobe.gui.domElement.getElementsByTagName("span")[30].innerHTML = "Play/Pause";
	menuGlobe.gui.domElement.getElementsByTagName("span")[27].innerHTML = "Montée à 5 m" ;
	menuGlobe.gui.domElement.getElementsByTagName("span")[28].innerHTML = "Montée à 7 m" ;
	menuGlobe.gui.domElement.getElementsByTagName("span")[29].innerHTML = "Montée à 9 m" ;
	menuGlobe.gui.domElement.getElementsByTagName("span")[30].innerHTML = "Style Abstrait" ;
	
    adjustAltitude(0.1);
    animateLines();
	//animateColor();
    window.addEventListener('click', picking, false);
});







let delta_z = 3;
// from itowns examples, can't say I really understand what is going on...
function picking(event) {
    if (globeView.controls.isPaused()) {
        //var htmlInfo = document.getElementById('info');
        var intersects = globeView.pickObjectsAt(event, 10, 'WFS Buildings Remarquable'); //get the information about Buildings Remarquable
        var intersects2 = globeView.pickObjectsAt(event, 10, 'WFS Buildings'); //get the information about Buildings
        var properties;
        var info;
        htmlInfo.innerHTML = ' ';
        document.getElementById("batchLegende").style.visibility = "hidden";
        //changeBoardInfos(300);
        if (intersects.length) {
            var geometry = intersects[0].object.feature.geometry;
            var idPt = (intersects[0].face.a) % (intersects[0].object.feature.vertices.length / 3);
            var id = binarySearch(geometry, idPt);
            properties = geometry[id].properties;

            Object.keys(properties).map(function(objectKey) {
                var value = properties[objectKey];
                var key = objectKey.toString();
                if (key[0] !== '_' && key !== 'geometry_name') {
                    info = value.toString();
                    htmlInfo.innerHTML += '<li><b>' + key + ': </b>' + info + '</li>';
                }
            });


            //Buildings Remarquable
            if (properties['z_min'] > 0.1) { //if the user chooses to click on a Building
                if (currentWaterLevel.val <= 0.1) { //if waterlevel < 0.1 (no scenario)
                    document.getElementById("batchLegende").style.visibility = "visible"; //display the batchLegende
                    if (currentWaterLevel.val - properties['z_min'] + delta_z > 1) {
                        changeBoardInfos(3.5); //red alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0.5) {
                        changeBoardInfos(2.5); //orange alert 
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0) {
                        changeBoardInfos(1); //yellow alert
                    } else {
                        changeBoardInfos(0.5); //white alert
                    }
                } else {
                    document.getElementById("batchLegende").style.visibility = "hidden"; //hide the batchLegende
                    if (currentWaterLevel.val - properties['z_min'] + delta_z > 1) {
                        changeBoardInfos(3.5); //red alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0.5) {
                        changeBoardInfos(2.5); //orange alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0) {
                        changeBoardInfos(1); //yellow alert
                    } else {
                        changeBoardInfos(0.5); //white alert
                    }

                }
            }
        }

        // Buildings
        if (intersects2.length) { //if the user chooses to click on a Building
            var geometry = intersects2[0].object.feature.geometry;
            var idPt = (intersects2[0].face.a) % (intersects2[0].object.feature.vertices.length / 3);
            var id = binarySearch(geometry, idPt);
            properties = geometry[id].properties;

            Object.keys(properties).map(function(objectKey) {
                var value = properties[objectKey];
                var key = objectKey.toString();
                if (key[0] !== '_' && key !== 'geometry_name') {
                    info = value.toString();
                    htmlInfo.innerHTML += '<li><b>' + key + ': </b>' + info + '</li>';
                }
            });
            if (properties['z_min'] > 0.1) { //if the user chooses to click on a Building
                if (currentWaterLevel.val <= 0.1) { //if waterlevel < 0.1 (no scenario)
                    document.getElementById("batchLegende").style.visibility = "visible"; //display the batchLegende
                    if (currentWaterLevel.val - properties['z_min'] + delta_z > 1) {
                        changeBoardInfos(3.5); //red alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0.5) {
                        changeBoardInfos(2.5); //orange alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0) {
                        changeBoardInfos(1); //yellow alert
                    } else {
                        changeBoardInfos(0.5); //green alert
                    }
                } else {
                    document.getElementById("batchLegende").style.visibility = "hidden"; //display the batchLegende
                    if (currentWaterLevel.val - properties['z_min'] + delta_z > 1) {
                        changeBoardInfos(3.5); //red alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0.5) {
                        changeBoardInfos(2.5); //orange alert
                    }  else if (currentWaterLevel.val - properties['z_min'] + delta_z > 0) {
                        changeBoardInfos(1); //yellow alert
                    } else {
                        changeBoardInfos(0.5); //white alert
                    }
                }
            }
        }


    }
}

let legends = [];
legends.push(document.getElementById('greenlegend'));
legends.push(document.getElementById('yellowlegend'));
legends.push(document.getElementById('orangelegend'));
legends.push(document.getElementById('redlegend'));



function changeBoardInfos(value) {
    boardInfo.innerHTML = '';
    let cl = 'bewareNiet';
    legends.forEach(element => {
        element.className = 'legend';
    });
    var triangle_red = document.getElementById("redsquare");
    if (value <= 0.7) {
        triangle_red.className = "blackcol";
        legends[0].className = cl;
        legends[1].className = "bewareothers";
        legends[2].className = "bewareothers";
        legends[3].className = "bewareothers";
    } else if (0.7 <= value && value <= 2) {
        cl = 'bewareYellow';
        legends[1].className = cl;
        legends[0].className = "bewareothers";
        legends[2].className = "bewareothers";
        legends[3].className = "bewareothers";
    } else if (2 < value && value <= 3) {
        cl = 'bewareOrange';
        legends[2].className = cl;
        legends[0].className = "bewareothers";
        legends[1].className = "bewareothers";
        legends[3].className = "bewareothers";
    } else if (value > 3) {
        cl = 'beware';
        legends[3].className = cl;
        legends[0].className = "bewareothers";
        legends[1].className = "bewareothers";
        legends[2].className = "bewareothers";
    } else if (value > 200) {
        legends[0].className = "bewareothers";
        legends[1].className = "bewareothers";
        legends[2].className = "bewareothers";
        legends[3].className = "bewareothers";

    }
}


function animateColor() {
	/*
	blinking colors
	*/
    time += 0.015;
	
    shadMatRem.uniforms.time.value = time;
    time = time % 1;
	

}



function animateLines() {
    time += 0.015;
	/*
    for (let i = 0; i < lines.length; ++i) {
        lines[i].material.dashSize = lines[i].material.gapSize * (1 + time);
    }
	*/
    shadMatRem.uniforms.time.value = time;
    time = time % 1;
    globeView.notifyChange(true);
    requestAnimationFrame(animateLines);
};

