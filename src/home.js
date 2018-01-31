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

function fetchJson(url,opts) {
	return fetch(url, opts).then(r => r.json());
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
								? walk(v[key],path.concat(key+".")) 
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
				return JSON.parse(this.editor.getValue()) ;
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
		onRemovedFromDOM(){
			this.editor.destroy() ;
		}
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
				Option({value:'Root'},"Root"),
				Option({value:'Query'},"Query"),
				Option({value:'Nodes'},"Nodes")
			) ;
			this.append(menu) ;
			this.append(()=> on (menu) (menu.selectedItem && ES[menu.selectedItem.value]({
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
						version:this.value.version
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
			const ESQueryJson = {
				'@addClass':'ES-Query-Json'
			} ;
			var indices = await fetchJson("http://"+this.host+"/_all/_mappings") ;
			this.append(
				DIV({style:{padding:'0.2em'}},
					SELECT({
						id:'method',
						get selectedValue(){ return this.selectedOptions[0].value }
					},['GET','POST','HEAD','PUT','DELETE'].map(m => OPTION(m))),
					()=> on (this.ids.index,this.ids.type) (INPUT({style:{width:'24em'}, id:'path',value:"/"+(this.ids.index.selectedItem||"?")+(this.ids.type.selectedItem||"")+"/_search"})),
					PopDownMenu({
						id:'index',
						options:() => sortKeys(indices)
					}),
					()=> on (this.ids.index) (PopDownMenu({
						id:'type',
						options:()=> [""].concat(sortKeys(indices[this.ids.index.selectedItem].mappings).map(type => "/"+type))
					})),
					Icon({
						'@addClass':'ES-Query-Go',
						icon:'caret-right',
						onclick: async (e)=> {
							try {
								e.target.disabled = true ;
								e.target.style.color = '#ccc' ;
								this.ids.result.value = undefined ;
								this.ids.result.value = await fetchJson("http://"+this.host+this.ids.path.value, { 
									method: this.ids.method.selectedValue,
									headers: this.ids.method.selectedValue in { POST:true, PUT:true } ? new Headers({ 'Content-Type': 'application/json' }) : undefined,
									body: this.ids.method.selectedValue in { POST:true, PUT:true } ? JSON.stringify(this.ids.query.value) : undefined
								})
							} catch (ex) {
								displayError(ex) ;
							}
							e.target.disabled = false ;
							e.target.style.color = '' ;
						}
					})
				),
				JsonEditor(Object.assign({id:'query'},ESQueryJson)),
				JsonEditor(Object.assign({id:'result'},ESQueryJson))
			) ;
		}
	}),
	Shards:DIV.extended({
		constructed(){
			this.append(this.shards.map(s => DIV(s.index+" "+s.shard+" "+s.prirep))) ;
		}
	}),
	Nodes:DIV.extended({
		async constructed() {
			var data = await fetchJson( "http://"+this.host+"/_nodes");
			
/*			var shards = await fetchJson( "http://"+this.host+"/_cat/shards?format=json") ;
			var maxShards = 0 ;
			shards.sort((a,b) => {
				if (a.index < b.index) return -1 ;
				if (a.index > b.index) return 1 ;
				maxShards = Math.max(maxShards,+a.shard,+b.shard) ;
				return (+a.shard)-(+b.shard) ;
			}) ; */
			
			var more ;
			this.append(
				DIV("Cluster Name: ",data.cluster_name),
				DIV(Object.keys(data.nodes).map(k => 
					ES.Node({onclick(){ more.value = data.nodes[k] },value:data.nodes[k]} /* , 
						ES.Shards({
							maxShards,
							shards:shards.filter(s => s.node === data.nodes[k].name)
						})*/
					))
				),
				(more = JsonEditor({style:{
						fontSize:'85%'
					},autoHeight:true})) 
			);			
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
