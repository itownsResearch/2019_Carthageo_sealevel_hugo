import * as itowns from 'itowns';
import * as THREE from 'three';
import { getColor } from './color';

function createMaterial(vShader, fShader) {

    let uniforms = {
        time: {type: 'f', value: 0.2},
        waterLevel: {type: 'f', value: 0.0},
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
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
        return;
    }
    if (waterLevel - zmin > 1.0){
		    gl_FragColor = vec4(1, 0, 0, 1.0);
        return;
    }
    if (waterLevel - zmin > 0.5){
        gl_FragColor = vec4(1, 0.6, 0, 1.0);
        return;
    }
    else if (waterLevel - zmin > 0.0){
        gl_FragColor = vec4(1, 1, 0, 1.0);
        return;
    }
    gl_FragColor = vec4(1, 1, 1, 1.0);
  }
`;
let delta_z = 3.0; //to calibrate the color change of the buildings
let shadMat = createMaterial(vertexShader, fragmentShader);
function addShader(result){
    result.material = shadMat;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

function altitudeBuildings(properties) {
    return - properties.hauteur;
}

function calc_zmin(properties){ // z_min = z_min - dz
	return properties.z_min - delta_z;
}



let getColorForLevelX = (nivEau) => ( (alti) => getColor(alti, nivEau) );
let colorForWater = getColorForLevelX(0);

function colorBuildings(properties) {
    let altiBuilding = altitudeBuildings(properties);
    return colorForWater(altiBuilding);
}

function  acceptFeature(p) {
    return p.z_min !== 9999;
}

let bati = {
    id: 'WFS Buildings',
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        //color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings,
        attributes: { // works for extruded meshes only
            //color: { type: Uint8Array, value: (prop, id, extruded) => { return new THREE.Color(extruded ? 0xffffff : 0x888888);}, itemSize:3, normalized:true },
            zbottom: { type: Float32Array, value: calc_zmin},
            id: { type: Uint32Array, value: (prop, id) => { return id;} }
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
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 12, max: 12 },  // Beware that showing building at smaller zoom than ~16 create some holes as the WFS service can't answer more than n polylines per request
        // extent: {
        //     west: 4.568,
        //     east: 5.18,
        //     south: 45.437,
        //     north: 46.03,
        // },
    }
};


// export default bati;
export {bati, shadMat};
