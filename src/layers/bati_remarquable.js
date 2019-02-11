import * as itowns from 'itowns';
import * as THREE from 'three';
import { getColor } from './color';

function createMaterial(vShader, fShader) {

    let uniforms = {
        time: {type: 'f', value: 1.0},
        waterLevel: {type: 'f', value: 0.0},
        zbot: { type: Float32Array, value: altitudeBuildings },
        // resolution: {type: "v2", value: new THREE.Vector2()},
    };
    // uniforms.resolution.value.x = window.innerWidth;
    // uniforms.resolution.value.y = window.innerHeight;

    let meshMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vShader,
        fragmentShader: fShader,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    return meshMaterial;
}

const vertexShader = `
#include <logdepthbuf_pars_vertex>
uniform float time;
attribute float zbottom;
varying float zmin;

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    zmin = zbottom;
    #include <logdepthbuf_vertex>
}
`;

const fragmentShader = `
#include <logdepthbuf_pars_fragment>
uniform float time;
uniform float waterLevel;
varying float zmin;

#define PI 3.14159
#define TWO_PI (PI*2.0)
#define N 68.5

void main(){
    #include <logdepthbuf_fragment>
    if (abs(zmin) > 1000.0){
        gl_FragColor = vec4(0.0, 0.0, 1.0, time);
        return;
    }
    if (waterLevel - zmin > 1.0){
		    gl_FragColor = vec4(1, 0, 0, time);
        return;
    }
    if (waterLevel - zmin > 0.5){
        gl_FragColor = vec4(1, 0.5, 0, time);
        return;
    }
    else if (waterLevel - zmin > 0.0){
        gl_FragColor = vec4(1, 1, 0, time);
        return;
    }
    gl_FragColor = vec4(0.93, 0.5, 0.93, 1.0);
  }
`;


let delta_z = 3.0; //to calibrate the color change of the buildings
let shadMatRem = createMaterial(vertexShader, fragmentShader);
function addShader(result){
    result.material = shadMatRem;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

function altitudeBuildings(properties) {
    return - properties.hauteur;
}
function calc_zmin(properties){
	return properties.z_min - delta_z;
}


//const nivEau = 20

let getColorForLevelX = (nivEau) => ( (alti) => getColor(alti, nivEau) );
let colorForWater = getColorForLevelX(0);

function colorBuildings(properties) {
    let altiBuilding = altitudeBuildings(properties);
    return colorForWater(altiBuilding);
    //return getColor(altiBuilding, 5);
}

function  acceptFeature(p) {
    return p.z_min !== 9999;
}

let batiRem = {
    id: 'WFS Buildings Remarquable',
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        //color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings,
        attributes: { // works for extruded meshes only
            // color: { type: Uint8Array, value: colorBuildings, itemSize:3, normalized:true }, // does not work
            zbottom: { type: Float32Array, value: calc_zmin },
            id: { type: Uint32Array, value: (prop, id) => { return id } }
        },
    }),
    onMeshCreated: addShader,
    // onMeshCreated: function scaleZ(mesh) {
    //     mesh.scale.z = 0.01;
    //     meshes.push(mesh);
    // },
    filter: acceptFeature,
    //mergeFeatures: false,
    source: {
        url: 'https://wxs.ign.fr/oej022d760omtb9y4b19bubh/geoportail/wfs?',
        protocol: 'wfs',
        version: '2.0.0',
        //typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 12, max: 12 },
        // extent: {
        //     west: 4.568,
        //     east: 5.18,
        //     south: 45.437,
        //     north: 46.03,
        // },
    }
};


// export default bati;
export {batiRem, shadMatRem};
