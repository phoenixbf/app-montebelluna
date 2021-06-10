/*
	Montebelluna Web-App
    based on ATON framework

    author: bruno.fanini@ispc.cnr.it

===============================================*/

ATON.PATH_RES        = "res/";
ATON.PATH_DRACO_LIB  = "dist/draco/";
ATON.PATH_COLLECTION = "content/";

let APP = {};
window.APP = APP;

APP.FOV_STD = 70.0;

APP.P_MODERN = 0;
APP.P_PAST   = 1;

APP.contentDir = "content/";
APP.audioDir   = "audio/";

APP.conf = undefined;

APP.currperiod = APP.P_MODERN;
APP.currpano   = 0;
APP.nextpano   = -1;

APP._bFirstPOV = false;
APP._pRotOffset = -(Math.PI * 0.5);


APP._bShowingPanel = false;

APP.init = ()=>{
    // Realize the base front-end
    ATON.FE.realize();

    // Our events
    APP.setupEvents();

    ATON.setDefaultPixelDensity(2.0);
    
    //ATON.setTimedGazeDuration(2.0);

    ATON.FE.popupBlurBG = 0.0;

    //ATON.setMainPanoramaInfinite(false);

    //ATON.Nav.setHomePOV( new ATON.POV().setPosition(0,0,0).setTarget(0,0,-1).setFOV(APP.FOV_STD) );

    ATON.FE.uiAddButtonFullScreen("idTopToolbar");
    $("#idTopToolbar").append("<div id='idbtn-switch' class='atonBTN' style='width:100px;'>PAST</div>");
    ATON.FE.uiAddButtonDeviceOrientation("idTopToolbar");

    ATON.Nav.setFirstPersonControl();
    ATON.Nav.setFOV(APP.FOV_STD);

    $("#idbtn-switch").click(()=>{
        if (APP.currperiod === APP.P_PAST){
            console.log("Switching to modern");

            APP.currperiod = APP.P_MODERN;
            APP.loadPanorama();

            $("#idbtn-switch").html("PAST");
            return;
        }

        if (APP.currperiod === APP.P_MODERN){
            console.log("Switching to past");

            APP.currperiod = APP.P_PAST;
            APP.loadPanorama();

            $("#idbtn-switch").html("TODAY");
            return;
        }
    });

    //$("#idPanel").hide();

    APP.buildSUI();

    //APP.matHL = new 

    // Load config
    APP.loadConfig("config.json");

    // update routine
    ATON.addUpdateRoutine( APP.update );

    APP._dirNode = new THREE.Vector3();
    APP._posNode = new THREE.Vector3();
};


APP.handleNextPanoSelection = ()=>{
    if (APP.conf === undefined) return;
    if (APP.conf.network === undefined) return;

    if (ATON.Nav.isTransitioning()) return;

    let E = ATON.Nav.getCurrentEyeLocation();
    let V = ATON.Nav.getCurrentDirection();

    //console.log(E);

    // Selected next loc
    APP.nextpano = -1;
    let mindist  = undefined;

    for (let i=0; i<APP.conf.network.length; i++){
        if (i !== APP.currpano){
            let p = APP.conf.network[i];

            APP._posNode.set(p.pos[0], p.pos[1], p.pos[2]);

            APP._dirNode.x = APP._posNode.x - E.x;
            APP._dirNode.y = APP._posNode.y - E.y;
            APP._dirNode.z = APP._posNode.z - E.z;
            APP._dirNode = APP._dirNode.normalize();

            let v = APP._dirNode.dot(V);
            if (v > 0.8){
                let d = E.distanceToSquared(APP._posNode);

                if (mindist === undefined || d<mindist){
                    mindist      = d;
                    APP.nextpano = i;
                    //console.log(APP.nextpano);
                }
            }
        }
    }

    if (APP.nextpano < 0){
        APP.suiTelep.visible = false;
        return;
    }

    const NL = APP.conf.network[APP.nextpano];

    APP.suiTelep.position.x = NL.pos[0];
    APP.suiTelep.position.y = NL.pos[1] - 1.3;
    APP.suiTelep.position.z = NL.pos[2];
/*
    APP.suiTelep.setPosition(
        E.x + (APP._dirNode.x * ATON.Nav.STD_FAR * 0.1),
        E.y + (APP._dirNode.y * ATON.Nav.STD_FAR * 0.1),
        E.z + (APP._dirNode.z * ATON.Nav.STD_FAR * 0.1)
    );
*/
    APP.suiTelep.visible = true;

    //console.log(APP.suiTelep.position);
};

// Update
APP.update = ()=>{
    APP.handleNextPanoSelection();

    //if (ATON._queryDataSem) console.log(ATON._queryDataSem);
    //if (ATON._queryDataUI)  console.log(ATON._queryDataUI);
};

APP.loadPanorama = ()=>{
    if (APP.conf.network === undefined) return;

    let p = APP.conf.network[APP.currpano];

    let post = (APP.currperiod === APP.P_MODERN)? "m.jpg" : "a.jpg";
    let purl = p.name + post;

    ATON.setMainPanorama(purl);
    //ATON.setMainPanoramaRotation(-Math.PI * 1.5);
    ATON.setMainPanoramaRotation(APP._pRotOffset);
    //ATON.setMainPanoramaRadius(1.0);

    console.log(purl);
};

APP.moveTo = (i)=>{
    if (APP.conf.network === undefined) return;

    APP.currpano = i;
    APP.loadPanorama();

    let p = APP.conf.network[APP.currpano];
    let pos = p.pos;
    console.log("Moving to ",pos);

    let V = ATON.Nav.getCurrentDirection();

    let P = new ATON.POV();
    P.setPosition(pos[0],pos[1],pos[2]);

    if (APP._bFirstPOV) 
        P.setTarget(pos[0]+V.x, pos[1]+V.y, pos[2]+V.z);
    else 
        P.setTarget(pos[0]+1.0, pos[1], pos[2]);
    
    P.setFOV(APP.FOV_STD);

    ATON.Nav.requestPOV(P, 0.5);
    APP._bFirstPOV = true;

    ATON.AudioHub.playOnceGlobally(APP.audioDir + "teleport.wav");

    //ATON.setMainPanoramaLocation( new THREE.Vector3(pos[0],pos[1],pos[2]));

    console.log(APP.currpano);
};

// Load config
APP.loadConfig = (path)=>{
    return $.getJSON( path, ( data )=>{
        //console.log(data);
        console.log("Loaded config: "+path);

        APP.conf = data;

        //let h = APP.conf.network[0];
        //ATON.Nav.setHomePOV( new ATON.POV().setPosition(h.pos[0],h.pos[1],h.pos[2]).setTarget(h.pos[0],h.pos[1],h.pos[2]-1.0).setFOV(APP.FOV_STD) );

        ATON.createSemanticNode("mainsem").attachToRoot();
        //ATON.createSemanticNode("esterni").load("proxies/Esterno.glb").attachTo("mainsem");

        //ATON.createSceneNode("esterni").load("proxies/Esterno.glb").attachToRoot();

        if (data.sem){
            for (let a in data.sem){
                //let A = ATON.createUINode( a );
                let A = ATON.createSemanticNode(a);
                //A.load("proxies/"+a+".gltf", ()=>{ A.enablePicking(); }).attachToRoot(); //.attachToRoot();
                
                //A.load("proxies/"+a+".glb", ()=>{ A.enablePicking() }).attachTo("mainsem");
                A.load("proxies/"+a+".glb").attachTo("mainsem");

                A.setMaterial( ATON.MatHub.materials.semanticShape );
                A.setDefaultAndHighlightMaterials(ATON.MatHub.materials.semanticShape, ATON.MatHub.materials.semanticShapeHL/*APP.matHL*/);

                //A.setScale(20.0)
                
                //A.frustumCulled = false;
                //A.enablePicking();

                //A.onHover = ()=>{ console.log(a); };

                //A.onHover = ()=>{ console.log(a); };
                //console.log(A);
            }

            ATON._bqSem = true;
            //ATON._bQuerySemOcclusion = true;
            //ATON._bqScene = true;
            
            //console.log(ATON._rootSem);
        }

        ATON.fireEvent("APP_ConfigLoaded");
    });
};

APP.updatePanel = (semid)=>{
    if (APP.conf === undefined) return;
    if (APP.conf.sem === undefined) return;
    
    let S = APP.conf.sem[semid];
    if (S === undefined) return;

    $("#idPanel").show();
    APP._bShowingPanel = true;

    ATON.AudioHub.playOnceGlobally(APP.audioDir + S.audio);

    let htmlcode = "";
    
    //htmlcode += "<div class='atonPopupTitle'>"+S.title+"</div>";
    htmlcode += "<div class='atonPopupTitle'><div id='idPanelClose' class='atonBTN atonBTN-red' style='float:left;margin:0px'>X</div>"+S.title+"</div>";
    
    //htmlcode += "<div id='idPanelClose' class='atonBTN atonBTN-red' style='z-index:100;' >X</div>"; // atonSidePanelCloseBTN

    htmlcode += "<div class='atonSidePanelContent'>";
    htmlcode += "<img src='"+APP.contentDir+"images/"+S.cover+"'>";
    htmlcode += "<div class='descriptionText'>"+S.descr+"</div>";
    htmlcode += "</div>";

    //htmlcode += "<div id='idPanelClose' class='atonBTN atonBTN-red atonSidePanelCloseBTN' >X</div>";

    $("#idPanel").html(htmlcode);

    $("#idPanelClose").click(()=>{
        $("#idPanel").hide();
        APP._bShowingPanel = false;
    });
};


// Our events
APP.setupEvents = ()=>{
    ATON.on("APP_ConfigLoaded",()=>{
        //ATON.Nav.requestHome();

        //APP.popupStart();

        APP.moveTo(4); // 0
    });

    ATON.on("SemanticNodeLeave", (semid)=>{
        let S = ATON.getSemanticNode(semid);
        if (S) S.restoreDefaultMaterial();

        //$("#idPanel").hide();

        //console.log(semid);
    });
    ATON.on("SemanticNodeHover", (semid)=>{
        let S = ATON.getSemanticNode(semid);
        if (S) S.highlight();

        APP.updatePanel(semid);

        //console.log(semid);
    });
/*
    ATON.on("UINodeLeave", (uiid)=>{
        console.log(uiid);
    });
    ATON.on("UINodeHover", (uiid)=>{
        console.log(uiid);
    });
*/
    ATON.on("DoubleTap", (e)=>{
        if (APP.nextpano < 0) return;

        APP.moveTo(APP.nextpano);
    });

    ATON.on("KeyPress", (k)=>{
        if (k==='p'){
            APP.currperiod = APP.P_PAST;
            APP.loadPanorama();
        }
        if (k==='m'){
            APP.currperiod = APP.P_MODERN;
            APP.loadPanorama();
        }

        if (k==='e'){
            console.log(ATON.Nav.getCurrentEyeLocation());
        }
        if (k==='v'){
            console.log(ATON.Nav.getCurrentDirection());
        }

        if (k==='x'){
            console.log(ATON._screenPointerCoords);
        }
    });
};


APP.buildSUI = ()=>{

    APP.suiTelep = new ATON.SUI.Button("suiTeleport");
    APP.suiTelep.setScale(16.0);
    APP.suiTelep.setRotation(-1.57079632679,0.0,0.0);
    //APP.suiTelep.setPosition(0.0,-2.0,0.0);
    APP.suiTelep.setIcon(APP.contentDir+"ui/teleport.png", true);
    APP.suiTelep.attachToRoot();

    console.log(APP.suiTelep);

/*
    APP.suiTelep.onSelect = ()=>{
        console.log("Trigger");

        ATON.AudioHub.playOnceGlobally(APP.audioDir + "teleport.wav");
    };
*/
/*
    APP.suiTelep = ATON.createUINode();
    let gTel = new THREE.CylinderBufferGeometry(1,1, 0.1, 32,1, true);

    let matTel = ATON.MatHub.materials.teleportLoc;
    matTel.depthTest = false;

    let mTeleport = new THREE.Mesh( gTel, matTel );
    mTeleport.frustumCulled = false;

    //mTeleport.renderOrder = 100;
    APP.suiTelep.add( mTeleport );
    APP.suiTelep.disablePicking();
    //APP.suiTelep.visible = false;

    APP.suiTelep.attachToRoot();
*/
};


window.addEventListener( 'load', ()=>{
    APP.init();
});
