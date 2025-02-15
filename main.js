import * as THREE from 'three';
import OpenSCAD from "./openscad.js";
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

async function getData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      window.alert(`Response status: ${response.status}`);
      throw new Error(`Response status: ${response.status}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    window.alert(`Error fetching code: ${error.message}`)
    console.error(error.message);
  }
}

async function generate(input) {
	const instance = await OpenSCAD({noInitialRun: true});

	const plateCode = await getData("https://raw.githack.com/cheyao/aniboard/main/CAD/plate.scad");
	const caseCode = await getData("https://raw.githack.com/cheyao/aniboard/main/CAD/case.scad");
	const assemblyCode = await getData("https://raw.githack.com/cheyao/aniboard/main/CAD/assembly.scad");
	const constantsCode = await getData("https://raw.githack.com/revarbat/BOSL/master/constants.scad");
	const shapesCode = await getData("https://raw.githack.com/revarbat/BOSL/master/shapes.scad");
	const mathCode = await getData("https://raw.githack.com/revarbat/BOSL/master/math.scad");
	const compatCode = await getData("https://raw.githack.com/revarbat/BOSL/master/compat.scad");
	const transformsCode = await getData("https://raw.githack.com/revarbat/BOSL/master/transforms.scad");

	let plateDxf = await getData("https://raw.githack.com/cheyao/aniboard/main/CAD/plate.dxf");
	if (document.getElementById("plate").files[0]) {
		plateDxf = await getData(URL.createObjectURL(document.getElementById("plate").files[0]));
	}

	const commonCode = `
	PLATE_FILE_NAME = "plate.dxf";
	`

	// Write a file to the filesystem
	instance.FS.mkdir("/BOSL");

	instance.FS.writeFile("/plate.scad", plateCode);
	instance.FS.writeFile("/case.scad", caseCode);
	instance.FS.writeFile("/assembly.scad", assemblyCode);
	instance.FS.writeFile("/common.scad", commonCode);
	instance.FS.writeFile("/plate.dxf", plateDxf);
	instance.FS.writeFile("/BOSL/constants.scad", constantsCode);
	instance.FS.writeFile("/BOSL/shapes.scad", shapesCode);
	instance.FS.writeFile("/BOSL/math.scad", mathCode);
	instance.FS.writeFile("/BOSL/compat.scad", compatCode);
	instance.FS.writeFile("/BOSL/transforms.scad", transformsCode);

	const args = [
		input,

		`-DKEYBOARD_ANGLE=${document.getElementById("angle").value}`,
		`-DKEYBOARD_OFFSET=${document.getElementById("padding").value}`,
		`-DPCB_ROUNDED=${document.getElementById("pr").checked}`,
		`-DPCB_FILLET_RADIUS=${document.getElementById("prr").value}`,

		`-DPCB_WIDTH=${document.getElementById("pw").value}`,
		`-DPCB_HEIGHT=${document.getElementById("ph").value}`,

		`-DUSB_OFFSET_X=${document.getElementById("uw").value}`,
		`-DUSB_OFFSET_Y=${document.getElementById("uh").value}`,
		`-DUSB_TURN=${document.getElementById("ut").checked}`,

		`-DKEY_OFFSET_X=${document.getElementById("ox").value}`,
		`-DKEY_OFFSET_Y=${document.getElementById("oy").value}`,
		`-DKEYS_WIDTH=${document.getElementById("wx").value}`,
		`-DKEYS_HEIGHT=${document.getElementById("wy").value}`,

		`-DWALL_THICKNESS=${document.getElementById("wt").value}`,

		`-DFILLET=${document.getElementById("fl").checked}`,
		`-DFILLET_RADIUS=${document.getElementById("flr").value}`,
		`-DCHAMFER=${document.getElementById("ch").checked}`,
		`-DCHAMFER_ANGLE=${document.getElementById("chan").value}`,
		`-DCHAMFER_AMMOUNT=${document.getElementById("cham").value}`,

		`-DSUPPORT_FILLET=${document.getElementById("sfl").checked}`,
		`-DSUPPORT_FILLET_RADIUS=${document.getElementById("sflr").value}`,
		`-DSUPPORT_CHAMFER=${document.getElementById("sch").checked}`,
		`-DSUPPORT_CHAMFER_AMMOUNT=${document.getElementById("scham").value}`,

		`-DSUPPORT_MARGIN=${document.getElementById("ss").value}`,

		`-DOLED_HOLE=${document.getElementById("oh").checked}`,
		`-DOLED_WIDTH=${document.getElementById("ohw").value}`,
		`-DOLED_HEIGHT=${document.getElementById("ohh").value}`,
		`-DOLED_OFFSET_X=${document.getElementById("ohx").value}`,
		`-DOLED_OFFSET_Y=${document.getElementById("ohy").value}`,

		`-DTOP_EXTEND=${document.getElementById("ext").value}`,
		`-DPCB_TO_BOTTOM=${document.getElementById("flex").value}`,

		`-DPCB_THICKNESS=${document.getElementById("pcbt").value}`,
		`-DPLATE_THICKNESS=${document.getElementById("plat").value}`,

		`-DUSB_CUTOUT_WIDTH=${document.getElementById("usbw").value}`,
		`-DUSB_CUTOUT_HEIGHT=${document.getElementById("usbh").value}`,

		`-o`, `assembly.stl`
	];
	console.log(args);
	instance.callMain(args);

	return instance;
}

function rrender(file, dl = false, dlname="") {
	generate(file).then((instance) => {

	const output = instance.FS.readFile("/assembly.stl");

	// Convert format
	const stl = URL.createObjectURL(new Blob([output], { type: "application/octet-stream" }), null);

	const loader = new STLLoader();
	loader.load(stl, function (geometry) {
	const scene = new THREE.Scene();
	const material = new THREE.MeshStandardMaterial({ color: 0xFAD82C });
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(0, 0, 0);
	scene.add(mesh);

	const exporter = new GLTFExporter();
	exporter.parse(scene, function (gltf) {

		if ( gltf instanceof ArrayBuffer ) {
		      window.alert(`Dm @Cyao on slack saying to implement glb format`);
		}

		const output = JSON.stringify(gltf, null, 2);
		const blob = new Blob([output], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const modelViewer = document.querySelector("model-viewer");
		modelViewer.src = url;
		modelViewer.poster = "";
	});

	});

		if (dl) {
	const output = instance.FS.readFile("/assembly.stl");

	const link = document.createElement("a");
	link.href = URL.createObjectURL(new Blob([output], { type: "application/octet-stream" }), null);
	link.download = dlname;
	document.body.append(link);
	link.click();
	link.remove();
		}
	});
}

function render() {
	const instance = rrender("/assembly.scad");
}

function gcase() {
	const instance = rrender("/case.scad", true, "case.stl");
}

function gplate() {
	const instance = rrender("/plate.scad", true, "plate.stl");
}

document.querySelector('#render').addEventListener('click', render);
document.querySelector('#gplate').addEventListener('click', gplate);
document.querySelector('#gcase').addEventListener('click', gcase);
