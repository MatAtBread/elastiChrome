import po from './po.js';

po.enableOnRemovedFromDOM() ;
po.tag(window,"DIV,INPUT,BUTTON,SPAN,TABLE,TR,TD,A,SELECT,OPTION",{
	properties(fields){
		var values = {} ;
		Object.keys(fields).forEach(key => {
			values[key] = this[key] ;
			Object.defineProperty(this,key,{
				get(){
					if (fields[key].get)
						values[key] = fields[key].get.call(this,values[key]) ;
					return values[key] ;
				},
				set(v){
					if (fields[key].set)
						fields[key].set.call(this,v,values[key]) ;
					values[key] = v ;
				}
			}) ;
			if (key in this)
				fields[key].set.call(this,values[key]) ;
		}) ;
	}
}) ;

// Parse strings like "1.23mb" into numbers of bytes
function parseMem(s) {
	if (s===null) return 0 ;
	var m = s.match(/([+\-0-9.]+)\s*([kmgtpb])/) ;
	return +m[1]*({
		b:1,
		k:1024,
		m:1024*1024,
		g:1024*1024*1024,
		t:1024*1024*1024*1024,
		p:1024*1024*1024*1024*1024,
	}[m[2]]) ;

}

/* Return a number with comma separated thousands upto a billion, or use kMGPT */
Number.prototype.toHumanString = function() {
    if (isNaN(this) || this===null || this===undefined)
        return null ;
    var eng = 0 ;
    var n = this ;
    while (Math.abs(n) >= 1e4) { n = n/1000 ; eng++ }
    var i = n|0 ;
    var f = 0 ; //n-i ;
    var j = ""+i ;
    var r = "" ;
    while (j.length) {
        r = j.slice(-3)+","+r ;
        j = j.slice(0,-3) ;
    }
    r = r.slice(0,-1) ;
    return (f && !eng?r+"."+f: r.split(".")[0]+" kMGPT"[eng]) ;
}

Number.prototype.toHumanPeriod = function(noZeros,defaultValue) {
    if (isNaN(this) || this===null || this===undefined)
        return defaultValue ;
    var min = this/60000 |0 ;
    var sec = (this/1000 |0)%60 ;
    if (min>=120)
        return (min/60|0)+"\u02B0"+(noZeros ? "":("0"+(min%60)).slice(-2)+"\u1D50");
    return min?min+"\u1D50"+(noZeros?"":("0"+sec).slice(-2)+"\u02e2"):sec+"\u02e2" ;
}

Number.prototype.toHumanPercent = function() {
    if (this == 0) return "0%" ;
    if (this < 1 && this > 0) return "."+((this*10 |0)||1)+"%" ;
    if (this > -1 && this < 0) return "-."+((this*10 |0)||1)+"%" ;
    return (this|0)+"%" ;
}

function fetchJson(url,opts) {
	return fetch(url, opts).then(async r =>{ 
		if (r.status===200 ) 
			return r.json() ; 
		var body = await r.text() ;
		throw new Error(r.url+"\n\n"+r.statusText+" "+r.status+"\n"+body) ; 
	});
}

function displayError(ex) {
	alert(/*ex.messasge ||*/ ex.toString()) ;
}

function updateProfile(obj) {
	console.log(obj) ;
	localStorage.profile = JSON.stringify(Object.assign(profile(),obj)) ;
}

function profile() {
	return JSON.parse(localStorage.profile || "{}") ;
}

const Select = SELECT.extended({
	prototype:{
		get selectedItem(){ return this.selectedOptions[0] },
		get selectedValue(){ return this.selectedItem.value }
	}
});

export const Icon = SPAN.extended(() => ({
	constructed() {
		this.classList.add('fa');
		this.properties({
			icon:{
				set(newValue,oldValue) {
					this.classList.remove('fa-' + oldValue);
					this.classList.add('fa-' + newValue);
				}
			}
		}) ;
	},
	prototype: {
		'@addClass': 'Icon'
	}
}));

const DataTable = TABLE.extended({
	constructed(){
		this.properties({
			value:{
				set:value =>{
					function walk(v,path) {
						return v && Object.keys(v).map(key => 
							v[key] && typeof v[key]==='object' 
								? walk(v[key],path.concat(Array.isArray(v)?"["+key+"]":key+".")) 
								: TR(TD(path.join(""),key),TD(v[key])))
					}
					this.removeChildren(this.childNodes) ;
					this.append(walk(value,[])) ;
				}
			}
		}) ;
	}
}) ;

const JsonEditor = DIV.extended({
	async constructed(){
		this.editor = ace.edit(this) ;
		this.editor.setShowPrintMargin(false);
		this.editor.getSession().setMode("ace/mode/javascript");
		this.properties({value:{
			get:() => {
				// Use 'eval' so sloppy JSON is allowed :)
				return eval("("+this.editor.getValue()+")") ;
//				return JSON.parse(this.editor.getValue()) ;
			}, 
			set:obj => {
				if (obj===undefined)
					this.editor.setValue('') ;
				else {
					var str = JSON.stringify(obj,null,2) ;
					if (this.autoHeight) {
//						var r = this.getBoundingClientRect(this.parentNode) ;
//						var s = this.getBoundingClientRect(this) ;
//						this.style.maxHeight = (r.height-s.top)+"px" ;
						this.style.height = (5+str.split("\n").length)+"em" ;
					}
					this.editor.setValue(str) ;
				}
				this.editor.clearSelection() ;
				this.editor.renderer.onResize(true);
			}
		}}) ;
	},
	prototype:{
		getText() { return this.editor.getValue() },
		setText(t) { return this.editor.setValue(t) },
		onRemovedFromDOM(){
			this.editor.destroy() ;
		}
	}
}) ;

const DataDisplay = DIV.extended({
	constructed(){
		var format = Select({id:'format', style:{ position:'absolute', top: '6em', right:'1em'}},
				OPTION({format:JsonEditor},"JSON"),
				OPTION({format:DataTable},"Flat")
		) ;
		this.append(()=> on (format) (format.selectedItem && format.selectedItem.format({style:{
			height:'-webkit-fill-available',
			width:'100%'
		},id:'data',value:this.ids.data && this.ids.data.value})),format) ;
	},
	prototype:{
		get value() { return this.firstChild.value },
		set value(v) { this.firstChild.value = v },
	}
}) ;

const PopDownMenu = BUTTON.extended({
	styles:`
	.PopDownMenu {
		position: relative;
		padding-left: 0.4em;
		padding-right: 0.4em;
	}
	.PopDownMenu-menu {
		position: absolute;
	    background-color: black;
	    color:white;
	    border: 1px solid #ccc;
	    margin: 0.5em;
	    padding: 0.5em;
	    text-overflow: ellipsis;
	    white-space: nowrap;
	    text-align: left;
	    left: 0;	
	    z-index:99999;
	    max-height: 30em;
	    overflow-y: scroll;
    }
	.PopDownMenu-menu > DIV {
		padding: 0.25em;
		min-height: 1em;
    }
	.PopDownMenu-menu > DIV:hover {
	    background-color: #66c;
    }
	`,
	constructed() {
		this.className = 'PopDownMenu' ;
		this.append(Icon({icon: 'caret-down', style:{ fontSize:'1.2em'}})) ;
	},
	prototype:{
		selected(k){
			this.selectedItem = k ;
			this.dispatchEvent(new Event("change")) ;
		},
		async onclick(){
			var pops = this.querySelector('.PopDownMenu-menu') ;
			if (pops) {
				pops.remove() ;
			} else {
				var opts = await this.options() ;
				if (Array.isArray(opts)) {
					this.append(DIV({ '@addClass': 'PopDownMenu-menu' },opts.map(k => DIV({onclick:e => this.selected(k), value:k},k)))) ;
				} else {
					this.append(DIV({ '@addClass': 'PopDownMenu-menu' },Object.keys(opts).map(k => DIV({onclick:e => this.selected(k), value:opts[k]},k)))) ;
				}
			}
		}
	}
}) ;

function sortKeys(o,f){
	f = f || ((a,b) => a<b?-1:(a>b?1:0)) ;
	return Object.keys(o).sort((a,b) => f(a,b,o)) ;
}

const Option = SPAN.extended({
	styles:`
	.Option {
		display: inline-block;
		margin: 0.4em;
		cursor: pointer; 
		margin-bottom: 0.2em;
		border-bottom: 2px solid rgba(0,0,0,0);
	}
	.Option:hover {
		background-color: #aaa;
		color: white;
	}
	.Option.selected {
		border-bottom: 2px solid black;
	}
	`,
	prototype:{
		'@addClass':'Option',
		onclick() { 
			if (this.parentNode.selectedItem)
				this.parentNode.selectedItem.classList.remove("selected") ;
			this.parentNode.selectedItem = this ; 
			this.parentNode.dispatchEvent(new Event("change")) ;
			this.parentNode.selectedItem.classList.add("selected") ;
		}

	}
}) ;

var histIdx = 0 ;
const ES = {
	Explorer:DIV.extended({
		styles:`
		.ES-Explorer {
		}
		`,
		constructed(){
			var menu = DIV({
					style:{
						backgroundColor:'#eee',
						color:'black',
						border:'1px solid black'
					}
				},
				Option({value:'Query'},"Query"),
				Option({value:'Nodes'},"Nodes")
			) ;
			this.append(menu) ;
			this.append(()=> on (menu) ((menu.selectedItem ? ES[menu.selectedItem.value] : ES.Root)({
				host:this.host,
				'@addClass':'ES-Explorer'
			}))) ;
		}
	}),
	Node:DIV.extended({
		styles:`
		.ES-Node {
			margin:1em;
			display: inline-block;
			border: 1px solid black;
			white-space: nowrap;
		}
		`,
		constructed(){
			var more ;
			this.insertAt(null,
				Icon({icon:'server',style:{ width:'100%', textAlign:'center', fontSize:'4em'}}),
				DIV({ style:{ fontSize:'0.85em'} },
					DataTable({value:{
						name:this.value.name,
						host:this.value.host,
						docs:this.value.indices.docs.count.toHumanString()+" (-"+this.value.indices.docs.deleted.toHumanString()+")",
						CPU:('percent' in this.value.os.cpu ? this.value.os.cpu.percent : (100 - this.value.os.cpu.idle)).toHumanPercent(),
						Load:this.value.os.cpu.load_average && Object.keys(this.value.os.cpu.load_average).map(k => this.value.os.cpu.load_average[k]).join(", "),
						'Disk Used':(100*(1-this.value.fs.total.available_in_bytes / this.value.fs.total.total_in_bytes)).toHumanPercent(),
						'Heap Used': this.value.jvm.mem.heap_used_percent.toHumanPercent()
					}})
				)
			) ;
		},
		prototype:{
			'@addClass':'ES-Node'
		}
	}),
	Query:DIV.extended({
		styles:`
			.ES-Query-Json {
				vertical-align: top;
				display: inline-block;
				width: 49%;
				font-size: 0.85em;
				height: -webkit-fill-available;
				max-height: -webkit-fill-available;
				min-height: -webkit-fill-available;
			}
			.ES-Query-Go {
				color:green;
				font-size:1.5em;
				vertical-align:middle;
				margin:0 0.5em;
			}
		`,
		async constructed(){
			const hasBody = ()=> this.ids.method.selectedValue in { POST:true, PUT:true } ;
			
			var indices = await fetchJson("http://"+this.host+"/_all/_mappings") ;
			this.append(
				DIV({style:{padding:'0.2em'}},
					Select({
						id:'method',
						onchange:e => this.ids.query.style.opacity = hasBody() ? 1:0.3
					},['GET','POST','HEAD','PUT','DELETE'].map(m => OPTION(m))),
					()=> on (this.ids.index,this.ids.type) (INPUT({style:{width:'24em'}, id:'path',value:"/"+(this.ids.index.selectedItem||"?")+(this.ids.type.selectedItem||"")})),
					PopDownMenu({
						id:'index',
						options:() => sortKeys(indices)
					}),
					()=> on (this.ids.index) (PopDownMenu({
						id:'type',
						options:()=> ["/_search","/_settings","/_mapping"].concat(sortKeys(indices[this.ids.index.selectedItem].mappings).map(type => "/"+type+"/_search"))
					})),
					Icon({
						'@addClass':'ES-Query-Go',
						icon:'caret-right',
						onclick: async (e)=> {
							try {
								var history = Array.isArray(profile().history) ? profile().history : [] ;
								history.unshift(this.ids.query.value) ;
								updateProfile({history, lastQuery:this.ids.query.value});
								histIdx = history.length-1 ;
								e.target.disabled = true ;
								e.target.style.color = '#ccc' ;
								this.ids.result.value = undefined ;
								this.ids.result.value = await fetchJson("http://"+this.host+this.ids.path.value, { 
									method: this.ids.method.selectedValue,
									headers: hasBody() ? new Headers({ 'Content-Type': 'application/json' }) : undefined,
									body: hasBody() ? JSON.stringify(this.ids.query.value) : undefined
								})
							} catch (ex) {
								displayError(ex) ;
							}
							e.target.disabled = false ;
							e.target.style.color = '' ;
						}
					}),
					Icon({icon:'paragraph', onclick:e=>{
						this.ids.query.value = this.ids.query.value ;
					}}),
					Icon({id:'leftArrow',icon:'arrow-left', onclick:e=>{
						histIdx += 1 ;
						if (histIdx >= profile().history.length)
							histIdx = profile().history.length-1 ;
						this.ids.query.value = profile().history[histIdx] ;
						e.target.dispatchEvent(new Event("change")) ;
					}}),
					()=> on(this.ids.leftArrow, this.ids.rightArrow) (SPAN(histIdx)),
					Icon({id:'rightArrow',icon:'arrow-right', onclick:e=>{
						histIdx -= 1 ;
						if (histIdx < 0)
							histIdx = 0 ;
						this.ids.query.value = profile().history[histIdx] ;
						e.target.dispatchEvent(new Event("change")) ;
					}}),
					""
				),
				JsonEditor({style:{ opacity:0.3 },id:'query','@addClass':'ES-Query-Json',value:profile().lastQuery||{}}),
				DataDisplay({id:'result','@addClass':'ES-Query-Json'})
			) ;
		}
	}),
	Nodes:DIV.extended({
		styles:`
			.ES-Nodes .Icon {
				font-size: 2em;
			}
			.ES-Nodes .Icon.p {
				position: absolute;
				color: black ;
			}
			.ES-Nodes .Icon.r {
				position: absolute;
				color: #aaa ;
			}
			.ES-Nodes .Icon.STARTED {
				background-color: #cfc;
			}
			.ES-Nodes .Icon.INITIALIZING {
				background-color: #fcf;
			}
			.ES-Nodes .Icon.UNASSIGNED {
				background-color: #fcc;
			}
			.ES-Nodes .Icon.RELOCATING {
				background-color: #cff;
			}
			.ES-Nodes .Icon > span {
			    position: absolute;
			    left: 30%;
			    z-index: 2;
			    color: white;
			    font-size: 0.7em;
			    top: 12%;
			}
			.ES-Nodes tr {
				min-height: 2.3em;
			}
			.ES-Nodes td {
				background-color: #eee;
				min-width:9em;
			}
			.ES-Nodes tr > td:first-child {
				white-space: nowrap;
			}
		`,
		async constructed() {
			var data = await fetchJson( "http://"+this.host+"/_nodes/stats");
			
			var shards = await fetchJson( "http://"+this.host+"/_cat/shards?format=json") ;
			var maxShards = 0 ;
			var indices = {} ;
			shards.forEach(s => {
				maxShards = Math.max(maxShards,+s.shard) ;
				indices[s.index] = indices[s.index] || {} ; 
				indices[s.index][s.node] = indices[s.index][s.node] || [] ;
				indices[s.index][s.node].push(s) ;
			}) ;

			function nodeName(a,b) {
				return a.name < b.name ? -1 : a.name > b.name ? 1 : 0 ;
			}
			
			var docs, store ;
			this.append(
				DIV("Cluster Name: ",data.cluster_name),
				TABLE({ className:'ES-Nodes' },
					TR(TD(INPUT({id:'indexname', onkeyup:e=>{
						try {
							var reg = this.ids.indexname.value && new RegExp(this.ids.indexname.value,"i") ;
							this.querySelectorAll('.ES-Node-Index').forEach(indexRow => indexRow.style.display = !reg || indexRow.value.match(reg) ? '':'none') ;
							this.ids.nameerror.innerText = '' ;
						} catch (ex) {
							this.ids.nameerror.innerText = ex.message ;
						}
					}}), DIV({id:'nameerror', style:{
						whiteSpace:'normal',
						color:'#d22',
						fontWeight:550,
						fontSize:"90%"
					}})),Object.keys(data.nodes).map(k => 
						ES.Node({ style:{display:'table-cell'},value:data.nodes[k] })
					)),
					Object.keys(indices).sort().map(i => { 
						var tot = { docs:0, store:0 };
						return TR({className:'ES-Node-Index', value:i},
							TD(Icon({ icon:'database'}),i),
							Object.keys(data.nodes).map(n => indices[i][data.nodes[n].name] ? TD({style:{position:'relative'}},indices[i][data.nodes[n].name].map(z => { 
								if (z.prirep === 'p') {
									tot.docs += +z.docs ;
//console.log(i,z.store, parseMem(z.store), tot.store, tot.store+parseMem(z.store));
									tot.store += parseMem(z.store) ;
								}
								return Icon({ 
									title: z.docs+' docs\n'+z.store+'\n'+(parseMem(z.store)/z.docs|0)+" per doc",
									className:z.state+' '+z.prirep, 
									icon:'hdd',
									style: { left: (z.shard*1.4)+"em", bottom:0 }
									},SPAN({ style:{position: 'absolute', right:0}},z.shard)) 
							})) : TD()),
							TD(Icon({ icon:'database'}),DIV({style:{display:'inline-block',fontSize:"0.75em"}},[tot.docs+' docs',tot.store.toHumanString()+'b',(tot.store/tot.docs|0)+" per doc"].map(t => DIV(t))))
					)
				})
			))
		}
	}),
	Root:DataTable.extended({
		styles:`
			.ES-Root {}
			.ES-Root > TR > TD {
				margin: 0.2em;
				padding: 0.1em;
				background-color: #eee;
			}
		`,
		async constructed(){
			this.value = await fetchJson( "http://"+this.host+"/", { method: 'GET', mode: 'cors' }) ;
		},
		prototype:{
			'@addClass':'ES-Root',
			autoHeight:true
		}
	})
} ;

const App = DIV.extended({
	styles:`
	.App {
		position:absolute;
		top:0;
		bottom:0;
		left:0;
		right:0;
	}
	`,
	constructed(){
		this.append(
			DIV({style:{backgroundColor:'#333'}},
				INPUT({style:{width:"24em",margin:"0.3em"},id:'host',value:profile().lastUrl || ""}),
				PopDownMenu({
					style:{
						left: '-0.3em'
					},
					options:() => sortKeys(profile().hosts,(a,b,o) => { o[b]-o[a] }),
					selected:option => this.ids.host.value = option,
				}),
				BUTTON({id:'connect', onclick:() => { 
					if (this.ids.host.value.startsWith("http://"))
						this.ids.host.value = this.ids.host.value.substring(7) ;
					this.ids.host.value = this.ids.host.value.split("/")[0] ;
					
					updateProfile({
						hosts:Object.assign(profile().hosts || {},{[this.ids.host.value]:Date.now()}),
						lastUrl:this.ids.host.value
					}) ;
				}},"Connect")),
				
				e => on (this.ids.connect,'click') (e && ES.Explorer({ host:this.ids.host.value }))
		);
		
	},
	prototype:{
		'@addClass':'App'
	}
}) ;

document.body.appendChild(App()) ;
