// Generated from openapi.json by scripts/generate-validators.mjs. Do not edit.
"use strict";
export const Catalog = validate11;
const schema12 = {"properties":{"items":{"items":{"$ref":"#/components/schemas/CatalogEntry"},"type":"array","title":"Items"},"total":{"type":"integer","title":"Total"},"next_cursor":{"anyOf":[{"type":"integer"},{"type":"null"}],"title":"Next Cursor"}},"additionalProperties":false,"type":"object","required":["items","total"],"title":"Catalog"};
const schema13 = {"properties":{"manifest":{"$ref":"#/components/schemas/Manifest"},"status":{"type":"string","enum":["available","disabled","unavailable","incompatible"],"title":"Status"},"reason":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Reason"},"available_operations":{"items":{"type":"string"},"type":"array","title":"Available Operations"}},"additionalProperties":false,"type":"object","required":["manifest","status","available_operations"],"title":"CatalogEntry"};
const schema14 = {"properties":{"manifest_version":{"type":"integer","const":1,"title":"Manifest Version"},"tool_id":{"type":"string","pattern":"^[a-z][a-z0-9]*(-[a-z0-9]+)*$","title":"Tool Id"},"version":{"type":"string","pattern":"^\\d+\\.\\d+\\.\\d+$","title":"Version"},"name":{"type":"string","title":"Name"},"description":{"type":"string","title":"Description"},"category":{"type":"string","title":"Category"},"tags":{"items":{"type":"string"},"type":"array","title":"Tags"},"execution_target":{"type":"string","const":"backend","title":"Execution Target"},"supported_modes":{"items":{"type":"string","enum":["source-web","docker-web","desktop"]},"type":"array","title":"Supported Modes"},"required_capabilities":{"items":{"type":"string"},"type":"array","title":"Required Capabilities"},"dependencies":{"items":{"$ref":"#/components/schemas/Dependency"},"type":"array","title":"Dependencies"},"operations":{"items":{"$ref":"#/components/schemas/Operation"},"type":"array","title":"Operations"},"ui":{"$ref":"#/components/schemas/ToolUI"},"docs":{"$ref":"#/components/schemas/ToolDocs"}},"additionalProperties":false,"type":"object","required":["manifest_version","tool_id","version","name","description","category","tags","execution_target","supported_modes","required_capabilities","dependencies","operations","ui","docs"],"title":"Manifest"};
const schema15 = {"properties":{"tool_id":{"type":"string","pattern":"^[a-z][a-z0-9]*(-[a-z0-9]+)*$","title":"Tool Id"},"version":{"type":"string","pattern":"^\\d+\\.\\d+\\.\\d+$","title":"Version"},"optional":{"type":"boolean","title":"Optional","default":false}},"additionalProperties":false,"type":"object","required":["tool_id","version"],"title":"Dependency"};
const schema16 = {"properties":{"operation_id":{"type":"string","pattern":"^[a-z][a-z0-9]*(-[a-z0-9]+)*$","title":"Operation Id"},"title":{"type":"string","title":"Title"},"description":{"type":"string","title":"Description"},"effects":{"type":"string","enum":["read-only","write","destructive","external"],"title":"Effects"},"ai_authorization":{"type":"string","enum":["software-approval","conversation"],"title":"Ai Authorization","default":"software-approval"},"ai_callable":{"type":"boolean","const":true,"title":"Ai Callable"},"contract_version":{"type":"integer","const":1,"title":"Contract Version","default":1},"input_schema":{"type":"string","title":"Input Schema"},"output_schema":{"type":"string","title":"Output Schema"},"execution":{"type":"string","enum":["sync","job"],"title":"Execution","default":"sync"},"cancellable":{"type":"boolean","title":"Cancellable","default":false},"idempotent":{"type":"boolean","title":"Idempotent"},"timeout_seconds":{"type":"integer","maximum":30,"minimum":1,"title":"Timeout Seconds"},"max_input_bytes":{"type":"integer","minimum":1,"title":"Max Input Bytes"}},"additionalProperties":false,"type":"object","required":["operation_id","title","description","effects","ai_callable","input_schema","output_schema","idempotent","timeout_seconds","max_input_bytes"],"title":"Operation"};
const schema17 = {"properties":{"route":{"type":"string","pattern":"^/tools/[a-z0-9-]+$","title":"Route"}},"additionalProperties":false,"type":"object","required":["route"],"title":"ToolUI"};
const schema18 = {"properties":{"overview":{"type":"string","title":"Overview"},"usage":{"type":"string","title":"Usage"}},"additionalProperties":false,"type":"object","required":["overview","usage"],"title":"ToolDocs"};
const func2 = Object.prototype.hasOwnProperty;
const pattern0 = new RegExp("^[a-z][a-z0-9]*(-[a-z0-9]+)*$", "u");
const pattern1 = new RegExp("^\\d+\\.\\d+\\.\\d+$", "u");
const pattern5 = new RegExp("^/tools/[a-z0-9-]+$", "u");

function validate13(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((((data.manifest_version === undefined) && (missing0 = "manifest_version")) || ((data.tool_id === undefined) && (missing0 = "tool_id"))) || ((data.version === undefined) && (missing0 = "version"))) || ((data.name === undefined) && (missing0 = "name"))) || ((data.description === undefined) && (missing0 = "description"))) || ((data.category === undefined) && (missing0 = "category"))) || ((data.tags === undefined) && (missing0 = "tags"))) || ((data.execution_target === undefined) && (missing0 = "execution_target"))) || ((data.supported_modes === undefined) && (missing0 = "supported_modes"))) || ((data.required_capabilities === undefined) && (missing0 = "required_capabilities"))) || ((data.dependencies === undefined) && (missing0 = "dependencies"))) || ((data.operations === undefined) && (missing0 = "operations"))) || ((data.ui === undefined) && (missing0 = "ui"))) || ((data.docs === undefined) && (missing0 = "docs"))){
validate13.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func2.call(schema14.properties, key0))){
validate13.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.manifest_version !== undefined){
let data0 = data.manifest_version;
const _errs2 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate13.errors = [{instancePath:instancePath+"/manifest_version",schemaPath:"#/properties/manifest_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(1 !== data0){
validate13.errors = [{instancePath:instancePath+"/manifest_version",schemaPath:"#/properties/manifest_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tool_id !== undefined){
let data1 = data.tool_id;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern0.test(data1)){
validate13.errors = [{instancePath:instancePath+"/tool_id",schemaPath:"#/properties/tool_id/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z][a-z0-9]*(-[a-z0-9]+)*$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/tool_id",schemaPath:"#/properties/tool_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.version !== undefined){
let data2 = data.version;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data2 === "string"){
if(!pattern1.test(data2)){
validate13.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/pattern",keyword:"pattern",params:{pattern: "^\\d+\\.\\d+\\.\\d+$"},message:"must match pattern \""+"^\\d+\\.\\d+\\.\\d+$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
const _errs8 = errors;
if(typeof data.name !== "string"){
validate13.errors = [{instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs10 = errors;
if(typeof data.description !== "string"){
validate13.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.category !== undefined){
const _errs12 = errors;
if(typeof data.category !== "string"){
validate13.errors = [{instancePath:instancePath+"/category",schemaPath:"#/properties/category/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tags !== undefined){
let data6 = data.tags;
const _errs14 = errors;
if(errors === _errs14){
if(Array.isArray(data6)){
var valid1 = true;
const len0 = data6.length;
for(let i0=0; i0<len0; i0++){
const _errs16 = errors;
if(typeof data6[i0] !== "string"){
validate13.errors = [{instancePath:instancePath+"/tags/" + i0,schemaPath:"#/properties/tags/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs16 === errors;
if(!valid1){
break;
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/tags",schemaPath:"#/properties/tags/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.execution_target !== undefined){
let data8 = data.execution_target;
const _errs18 = errors;
if(typeof data8 !== "string"){
validate13.errors = [{instancePath:instancePath+"/execution_target",schemaPath:"#/properties/execution_target/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("backend" !== data8){
validate13.errors = [{instancePath:instancePath+"/execution_target",schemaPath:"#/properties/execution_target/const",keyword:"const",params:{allowedValue: "backend"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.supported_modes !== undefined){
let data9 = data.supported_modes;
const _errs20 = errors;
if(errors === _errs20){
if(Array.isArray(data9)){
var valid2 = true;
const len1 = data9.length;
for(let i1=0; i1<len1; i1++){
let data10 = data9[i1];
const _errs22 = errors;
if(typeof data10 !== "string"){
validate13.errors = [{instancePath:instancePath+"/supported_modes/" + i1,schemaPath:"#/properties/supported_modes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data10 === "source-web") || (data10 === "docker-web")) || (data10 === "desktop"))){
validate13.errors = [{instancePath:instancePath+"/supported_modes/" + i1,schemaPath:"#/properties/supported_modes/items/enum",keyword:"enum",params:{allowedValues: schema14.properties.supported_modes.items.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs22 === errors;
if(!valid2){
break;
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/supported_modes",schemaPath:"#/properties/supported_modes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.required_capabilities !== undefined){
let data11 = data.required_capabilities;
const _errs24 = errors;
if(errors === _errs24){
if(Array.isArray(data11)){
var valid3 = true;
const len2 = data11.length;
for(let i2=0; i2<len2; i2++){
const _errs26 = errors;
if(typeof data11[i2] !== "string"){
validate13.errors = [{instancePath:instancePath+"/required_capabilities/" + i2,schemaPath:"#/properties/required_capabilities/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs26 === errors;
if(!valid3){
break;
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/required_capabilities",schemaPath:"#/properties/required_capabilities/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dependencies !== undefined){
let data13 = data.dependencies;
const _errs28 = errors;
if(errors === _errs28){
if(Array.isArray(data13)){
var valid4 = true;
const len3 = data13.length;
for(let i3=0; i3<len3; i3++){
let data14 = data13[i3];
const _errs30 = errors;
const _errs31 = errors;
if(errors === _errs31){
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
let missing1;
if(((data14.tool_id === undefined) && (missing1 = "tool_id")) || ((data14.version === undefined) && (missing1 = "version"))){
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3,schemaPath:"#/components/schemas/Dependency/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs33 = errors;
for(const key1 in data14){
if(!(((key1 === "tool_id") || (key1 === "version")) || (key1 === "optional"))){
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3,schemaPath:"#/components/schemas/Dependency/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs33 === errors){
if(data14.tool_id !== undefined){
let data15 = data14.tool_id;
const _errs34 = errors;
if(errors === _errs34){
if(typeof data15 === "string"){
if(!pattern0.test(data15)){
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3+"/tool_id",schemaPath:"#/components/schemas/Dependency/properties/tool_id/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z][a-z0-9]*(-[a-z0-9]+)*$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3+"/tool_id",schemaPath:"#/components/schemas/Dependency/properties/tool_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs34 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data14.version !== undefined){
let data16 = data14.version;
const _errs36 = errors;
if(errors === _errs36){
if(typeof data16 === "string"){
if(!pattern1.test(data16)){
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3+"/version",schemaPath:"#/components/schemas/Dependency/properties/version/pattern",keyword:"pattern",params:{pattern: "^\\d+\\.\\d+\\.\\d+$"},message:"must match pattern \""+"^\\d+\\.\\d+\\.\\d+$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3+"/version",schemaPath:"#/components/schemas/Dependency/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs36 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data14.optional !== undefined){
const _errs38 = errors;
if(typeof data14.optional !== "boolean"){
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3+"/optional",schemaPath:"#/components/schemas/Dependency/properties/optional/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid6 = _errs38 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/dependencies/" + i3,schemaPath:"#/components/schemas/Dependency/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid4 = _errs30 === errors;
if(!valid4){
break;
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/dependencies",schemaPath:"#/properties/dependencies/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.operations !== undefined){
let data18 = data.operations;
const _errs40 = errors;
if(errors === _errs40){
if(Array.isArray(data18)){
var valid7 = true;
const len4 = data18.length;
for(let i4=0; i4<len4; i4++){
let data19 = data18[i4];
const _errs42 = errors;
const _errs43 = errors;
if(errors === _errs43){
if(data19 && typeof data19 == "object" && !Array.isArray(data19)){
let missing2;
if(((((((((((data19.operation_id === undefined) && (missing2 = "operation_id")) || ((data19.title === undefined) && (missing2 = "title"))) || ((data19.description === undefined) && (missing2 = "description"))) || ((data19.effects === undefined) && (missing2 = "effects"))) || ((data19.ai_callable === undefined) && (missing2 = "ai_callable"))) || ((data19.input_schema === undefined) && (missing2 = "input_schema"))) || ((data19.output_schema === undefined) && (missing2 = "output_schema"))) || ((data19.idempotent === undefined) && (missing2 = "idempotent"))) || ((data19.timeout_seconds === undefined) && (missing2 = "timeout_seconds"))) || ((data19.max_input_bytes === undefined) && (missing2 = "max_input_bytes"))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4,schemaPath:"#/components/schemas/Operation/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs45 = errors;
for(const key2 in data19){
if(!(func2.call(schema16.properties, key2))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4,schemaPath:"#/components/schemas/Operation/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs45 === errors){
if(data19.operation_id !== undefined){
let data20 = data19.operation_id;
const _errs46 = errors;
if(errors === _errs46){
if(typeof data20 === "string"){
if(!pattern0.test(data20)){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/operation_id",schemaPath:"#/components/schemas/Operation/properties/operation_id/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z][a-z0-9]*(-[a-z0-9]+)*$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/operation_id",schemaPath:"#/components/schemas/Operation/properties/operation_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid9 = _errs46 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.title !== undefined){
const _errs48 = errors;
if(typeof data19.title !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/title",schemaPath:"#/components/schemas/Operation/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs48 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.description !== undefined){
const _errs50 = errors;
if(typeof data19.description !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/description",schemaPath:"#/components/schemas/Operation/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs50 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.effects !== undefined){
let data23 = data19.effects;
const _errs52 = errors;
if(typeof data23 !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/effects",schemaPath:"#/components/schemas/Operation/properties/effects/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data23 === "read-only") || (data23 === "write")) || (data23 === "destructive")) || (data23 === "external"))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/effects",schemaPath:"#/components/schemas/Operation/properties/effects/enum",keyword:"enum",params:{allowedValues: schema16.properties.effects.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid9 = _errs52 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.ai_authorization !== undefined){
let data24 = data19.ai_authorization;
const _errs54 = errors;
if(typeof data24 !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/ai_authorization",schemaPath:"#/components/schemas/Operation/properties/ai_authorization/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data24 === "software-approval") || (data24 === "conversation"))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/ai_authorization",schemaPath:"#/components/schemas/Operation/properties/ai_authorization/enum",keyword:"enum",params:{allowedValues: schema16.properties.ai_authorization.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid9 = _errs54 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.ai_callable !== undefined){
let data25 = data19.ai_callable;
const _errs56 = errors;
if(typeof data25 !== "boolean"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/ai_callable",schemaPath:"#/components/schemas/Operation/properties/ai_callable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
if(true !== data25){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/ai_callable",schemaPath:"#/components/schemas/Operation/properties/ai_callable/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid9 = _errs56 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.contract_version !== undefined){
let data26 = data19.contract_version;
const _errs58 = errors;
if(!((typeof data26 == "number") && (!(data26 % 1) && !isNaN(data26)))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/contract_version",schemaPath:"#/components/schemas/Operation/properties/contract_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(1 !== data26){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/contract_version",schemaPath:"#/components/schemas/Operation/properties/contract_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid9 = _errs58 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.input_schema !== undefined){
const _errs60 = errors;
if(typeof data19.input_schema !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/input_schema",schemaPath:"#/components/schemas/Operation/properties/input_schema/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs60 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.output_schema !== undefined){
const _errs62 = errors;
if(typeof data19.output_schema !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/output_schema",schemaPath:"#/components/schemas/Operation/properties/output_schema/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs62 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.execution !== undefined){
let data29 = data19.execution;
const _errs64 = errors;
if(typeof data29 !== "string"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/execution",schemaPath:"#/components/schemas/Operation/properties/execution/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data29 === "sync") || (data29 === "job"))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/execution",schemaPath:"#/components/schemas/Operation/properties/execution/enum",keyword:"enum",params:{allowedValues: schema16.properties.execution.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid9 = _errs64 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.cancellable !== undefined){
const _errs66 = errors;
if(typeof data19.cancellable !== "boolean"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/cancellable",schemaPath:"#/components/schemas/Operation/properties/cancellable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid9 = _errs66 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.idempotent !== undefined){
const _errs68 = errors;
if(typeof data19.idempotent !== "boolean"){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/idempotent",schemaPath:"#/components/schemas/Operation/properties/idempotent/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid9 = _errs68 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.timeout_seconds !== undefined){
let data32 = data19.timeout_seconds;
const _errs70 = errors;
if(!((typeof data32 == "number") && (!(data32 % 1) && !isNaN(data32)))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/timeout_seconds",schemaPath:"#/components/schemas/Operation/properties/timeout_seconds/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs70){
if(typeof data32 == "number"){
if(data32 > 30 || isNaN(data32)){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/timeout_seconds",schemaPath:"#/components/schemas/Operation/properties/timeout_seconds/maximum",keyword:"maximum",params:{comparison: "<=", limit: 30},message:"must be <= 30"}];
return false;
}
else {
if(data32 < 1 || isNaN(data32)){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/timeout_seconds",schemaPath:"#/components/schemas/Operation/properties/timeout_seconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid9 = _errs70 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data19.max_input_bytes !== undefined){
let data33 = data19.max_input_bytes;
const _errs72 = errors;
if(!((typeof data33 == "number") && (!(data33 % 1) && !isNaN(data33)))){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/max_input_bytes",schemaPath:"#/components/schemas/Operation/properties/max_input_bytes/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs72){
if(typeof data33 == "number"){
if(data33 < 1 || isNaN(data33)){
validate13.errors = [{instancePath:instancePath+"/operations/" + i4+"/max_input_bytes",schemaPath:"#/components/schemas/Operation/properties/max_input_bytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
var valid9 = _errs72 === errors;
}
else {
var valid9 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/operations/" + i4,schemaPath:"#/components/schemas/Operation/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid7 = _errs42 === errors;
if(!valid7){
break;
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/operations",schemaPath:"#/properties/operations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ui !== undefined){
let data34 = data.ui;
const _errs74 = errors;
const _errs75 = errors;
if(errors === _errs75){
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
let missing3;
if((data34.route === undefined) && (missing3 = "route")){
validate13.errors = [{instancePath:instancePath+"/ui",schemaPath:"#/components/schemas/ToolUI/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
const _errs77 = errors;
for(const key3 in data34){
if(!(key3 === "route")){
validate13.errors = [{instancePath:instancePath+"/ui",schemaPath:"#/components/schemas/ToolUI/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs77 === errors){
if(data34.route !== undefined){
let data35 = data34.route;
const _errs78 = errors;
if(errors === _errs78){
if(typeof data35 === "string"){
if(!pattern5.test(data35)){
validate13.errors = [{instancePath:instancePath+"/ui/route",schemaPath:"#/components/schemas/ToolUI/properties/route/pattern",keyword:"pattern",params:{pattern: "^/tools/[a-z0-9-]+$"},message:"must match pattern \""+"^/tools/[a-z0-9-]+$"+"\""}];
return false;
}
}
else {
validate13.errors = [{instancePath:instancePath+"/ui/route",schemaPath:"#/components/schemas/ToolUI/properties/route/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/ui",schemaPath:"#/components/schemas/ToolUI/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs74 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.docs !== undefined){
let data36 = data.docs;
const _errs80 = errors;
const _errs81 = errors;
if(errors === _errs81){
if(data36 && typeof data36 == "object" && !Array.isArray(data36)){
let missing4;
if(((data36.overview === undefined) && (missing4 = "overview")) || ((data36.usage === undefined) && (missing4 = "usage"))){
validate13.errors = [{instancePath:instancePath+"/docs",schemaPath:"#/components/schemas/ToolDocs/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs83 = errors;
for(const key4 in data36){
if(!((key4 === "overview") || (key4 === "usage"))){
validate13.errors = [{instancePath:instancePath+"/docs",schemaPath:"#/components/schemas/ToolDocs/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs83 === errors){
if(data36.overview !== undefined){
const _errs84 = errors;
if(typeof data36.overview !== "string"){
validate13.errors = [{instancePath:instancePath+"/docs/overview",schemaPath:"#/components/schemas/ToolDocs/properties/overview/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid13 = _errs84 === errors;
}
else {
var valid13 = true;
}
if(valid13){
if(data36.usage !== undefined){
const _errs86 = errors;
if(typeof data36.usage !== "string"){
validate13.errors = [{instancePath:instancePath+"/docs/usage",schemaPath:"#/components/schemas/ToolDocs/properties/usage/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid13 = _errs86 === errors;
}
else {
var valid13 = true;
}
}
}
}
}
else {
validate13.errors = [{instancePath:instancePath+"/docs",schemaPath:"#/components/schemas/ToolDocs/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs80 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate13.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate13.errors = vErrors;
return errors === 0;
}


function validate12(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.manifest === undefined) && (missing0 = "manifest")) || ((data.status === undefined) && (missing0 = "status"))) || ((data.available_operations === undefined) && (missing0 = "available_operations"))){
validate12.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "manifest") || (key0 === "status")) || (key0 === "reason")) || (key0 === "available_operations"))){
validate12.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.manifest !== undefined){
const _errs2 = errors;
if(!(validate13(data.manifest, {instancePath:instancePath+"/manifest",parentData:data,parentDataProperty:"manifest",rootData}))){
vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data1 = data.status;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate12.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data1 === "available") || (data1 === "disabled")) || (data1 === "unavailable")) || (data1 === "incompatible"))){
validate12.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema13.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reason !== undefined){
let data2 = data.reason;
const _errs5 = errors;
const _errs6 = errors;
let valid1 = false;
const _errs7 = errors;
if(typeof data2 !== "string"){
const err0 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs7 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const _errs9 = errors;
if(data2 !== null){
const err1 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var _valid0 = _errs9 === errors;
valid1 = valid1 || _valid0;
}
if(!valid1){
const err2 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate12.errors = vErrors;
return false;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.available_operations !== undefined){
let data3 = data.available_operations;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data3)){
var valid2 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(typeof data3[i0] !== "string"){
validate12.errors = [{instancePath:instancePath+"/available_operations/" + i0,schemaPath:"#/properties/available_operations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs13 === errors;
if(!valid2){
break;
}
}
}
else {
validate12.errors = [{instancePath:instancePath+"/available_operations",schemaPath:"#/properties/available_operations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate12.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate12.errors = vErrors;
return errors === 0;
}


function validate11(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.items === undefined) && (missing0 = "items")) || ((data.total === undefined) && (missing0 = "total"))){
validate11.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "items") || (key0 === "total")) || (key0 === "next_cursor"))){
validate11.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.items !== undefined){
let data0 = data.items;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
const _errs4 = errors;
if(!(validate12(data0[i0], {instancePath:instancePath+"/items/" + i0,parentData:data0,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate12.errors : vErrors.concat(validate12.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate11.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.total !== undefined){
let data2 = data.total;
const _errs5 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate11.errors = [{instancePath:instancePath+"/total",schemaPath:"#/properties/total/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.next_cursor !== undefined){
let data3 = data.next_cursor;
const _errs7 = errors;
const _errs8 = errors;
let valid2 = false;
const _errs9 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err0 = {instancePath:instancePath+"/next_cursor",schemaPath:"#/properties/next_cursor/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs9 === errors;
valid2 = valid2 || _valid0;
if(!valid2){
const _errs11 = errors;
if(data3 !== null){
const err1 = {instancePath:instancePath+"/next_cursor",schemaPath:"#/properties/next_cursor/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var _valid0 = _errs11 === errors;
valid2 = valid2 || _valid0;
}
if(!valid2){
const err2 = {instancePath:instancePath+"/next_cursor",schemaPath:"#/properties/next_cursor/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate11.errors = vErrors;
return false;
}
else {
errors = _errs8;
if(vErrors !== null){
if(_errs8){
vErrors.length = _errs8;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate11.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate11.errors = vErrors;
return errors === 0;
}

export const CatalogEntry = validate16;

function validate16(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.manifest === undefined) && (missing0 = "manifest")) || ((data.status === undefined) && (missing0 = "status"))) || ((data.available_operations === undefined) && (missing0 = "available_operations"))){
validate16.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "manifest") || (key0 === "status")) || (key0 === "reason")) || (key0 === "available_operations"))){
validate16.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.manifest !== undefined){
const _errs2 = errors;
if(!(validate13(data.manifest, {instancePath:instancePath+"/manifest",parentData:data,parentDataProperty:"manifest",rootData}))){
vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data1 = data.status;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate16.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data1 === "available") || (data1 === "disabled")) || (data1 === "unavailable")) || (data1 === "incompatible"))){
validate16.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema13.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reason !== undefined){
let data2 = data.reason;
const _errs5 = errors;
const _errs6 = errors;
let valid1 = false;
const _errs7 = errors;
if(typeof data2 !== "string"){
const err0 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs7 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const _errs9 = errors;
if(data2 !== null){
const err1 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var _valid0 = _errs9 === errors;
valid1 = valid1 || _valid0;
}
if(!valid1){
const err2 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate16.errors = vErrors;
return false;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.available_operations !== undefined){
let data3 = data.available_operations;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data3)){
var valid2 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(typeof data3[i0] !== "string"){
validate16.errors = [{instancePath:instancePath+"/available_operations/" + i0,schemaPath:"#/properties/available_operations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs13 === errors;
if(!valid2){
break;
}
}
}
else {
validate16.errors = [{instancePath:instancePath+"/available_operations",schemaPath:"#/properties/available_operations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate16.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate16.errors = vErrors;
return errors === 0;
}

export const Capabilities = validate18;
const schema20 = {"properties":{"mode":{"type":"string","enum":["source-web","docker-web","desktop"],"title":"Mode"},"capabilities":{"additionalProperties":{"type":"boolean"},"type":"object","title":"Capabilities"},"jobs_supported":{"type":"boolean","title":"Jobs Supported","default":true},"artifacts_supported":{"type":"boolean","title":"Artifacts Supported","default":true},"artifact_retention_hours":{"type":"integer","maximum":168,"minimum":1,"title":"Artifact Retention Hours","default":24}},"additionalProperties":false,"type":"object","required":["mode","capabilities"],"title":"Capabilities"};

function validate18(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.mode === undefined) && (missing0 = "mode")) || ((data.capabilities === undefined) && (missing0 = "capabilities"))){
validate18.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "mode") || (key0 === "capabilities")) || (key0 === "jobs_supported")) || (key0 === "artifacts_supported")) || (key0 === "artifact_retention_hours"))){
validate18.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.mode !== undefined){
let data0 = data.mode;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate18.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data0 === "source-web") || (data0 === "docker-web")) || (data0 === "desktop"))){
validate18.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema20.properties.mode.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.capabilities !== undefined){
let data1 = data.capabilities;
const _errs4 = errors;
if(errors === _errs4){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
for(const key1 in data1){
const _errs7 = errors;
if(typeof data1[key1] !== "boolean"){
validate18.errors = [{instancePath:instancePath+"/capabilities/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/capabilities/additionalProperties/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
}
else {
validate18.errors = [{instancePath:instancePath+"/capabilities",schemaPath:"#/properties/capabilities/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.jobs_supported !== undefined){
const _errs9 = errors;
if(typeof data.jobs_supported !== "boolean"){
validate18.errors = [{instancePath:instancePath+"/jobs_supported",schemaPath:"#/properties/jobs_supported/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.artifacts_supported !== undefined){
const _errs11 = errors;
if(typeof data.artifacts_supported !== "boolean"){
validate18.errors = [{instancePath:instancePath+"/artifacts_supported",schemaPath:"#/properties/artifacts_supported/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.artifact_retention_hours !== undefined){
let data5 = data.artifact_retention_hours;
const _errs13 = errors;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
validate18.errors = [{instancePath:instancePath+"/artifact_retention_hours",schemaPath:"#/properties/artifact_retention_hours/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs13){
if(typeof data5 == "number"){
if(data5 > 168 || isNaN(data5)){
validate18.errors = [{instancePath:instancePath+"/artifact_retention_hours",schemaPath:"#/properties/artifact_retention_hours/maximum",keyword:"maximum",params:{comparison: "<=", limit: 168},message:"must be <= 168"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate18.errors = [{instancePath:instancePath+"/artifact_retention_hours",schemaPath:"#/properties/artifact_retention_hours/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate18.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate18.errors = vErrors;
return errors === 0;
}

export const ErrorResponse = validate19;
const schema21 = {"properties":{"error":{"$ref":"#/components/schemas/ErrorInfo"},"request_id":{"type":"string","title":"Request Id"}},"additionalProperties":false,"type":"object","required":["error","request_id"],"title":"ErrorResponse"};
const schema22 = {"properties":{"code":{"type":"string","title":"Code"},"message":{"type":"string","title":"Message"},"details":{"items":{"additionalProperties":{"anyOf":[{"type":"string"},{"type":"integer"}]},"type":"object"},"type":"array","title":"Details"}},"additionalProperties":false,"type":"object","required":["code","message"],"title":"ErrorInfo"};

function validate19(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.error === undefined) && (missing0 = "error")) || ((data.request_id === undefined) && (missing0 = "request_id"))){
validate19.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "error") || (key0 === "request_id"))){
validate19.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.error !== undefined){
let data0 = data.error;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
let missing1;
if(((data0.code === undefined) && (missing1 = "code")) || ((data0.message === undefined) && (missing1 = "message"))){
validate19.errors = [{instancePath:instancePath+"/error",schemaPath:"#/components/schemas/ErrorInfo/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs5 = errors;
for(const key1 in data0){
if(!(((key1 === "code") || (key1 === "message")) || (key1 === "details"))){
validate19.errors = [{instancePath:instancePath+"/error",schemaPath:"#/components/schemas/ErrorInfo/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs5 === errors){
if(data0.code !== undefined){
const _errs6 = errors;
if(typeof data0.code !== "string"){
validate19.errors = [{instancePath:instancePath+"/error/code",schemaPath:"#/components/schemas/ErrorInfo/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs6 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data0.message !== undefined){
const _errs8 = errors;
if(typeof data0.message !== "string"){
validate19.errors = [{instancePath:instancePath+"/error/message",schemaPath:"#/components/schemas/ErrorInfo/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data0.details !== undefined){
let data3 = data0.details;
const _errs10 = errors;
if(errors === _errs10){
if(Array.isArray(data3)){
var valid3 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
const _errs12 = errors;
if(errors === _errs12){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
for(const key2 in data4){
let data5 = data4[key2];
const _errs15 = errors;
const _errs16 = errors;
let valid5 = false;
const _errs17 = errors;
if(typeof data5 !== "string"){
const err0 = {instancePath:instancePath+"/error/details/" + i0+"/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/components/schemas/ErrorInfo/properties/details/items/additionalProperties/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs17 === errors;
valid5 = valid5 || _valid0;
if(!valid5){
const _errs19 = errors;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
const err1 = {instancePath:instancePath+"/error/details/" + i0+"/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/components/schemas/ErrorInfo/properties/details/items/additionalProperties/anyOf/1/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var _valid0 = _errs19 === errors;
valid5 = valid5 || _valid0;
}
if(!valid5){
const err2 = {instancePath:instancePath+"/error/details/" + i0+"/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/components/schemas/ErrorInfo/properties/details/items/additionalProperties/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate19.errors = vErrors;
return false;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
var valid4 = _errs15 === errors;
if(!valid4){
break;
}
}
}
else {
validate19.errors = [{instancePath:instancePath+"/error/details/" + i0,schemaPath:"#/components/schemas/ErrorInfo/properties/details/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid3 = _errs12 === errors;
if(!valid3){
break;
}
}
}
else {
validate19.errors = [{instancePath:instancePath+"/error/details",schemaPath:"#/components/schemas/ErrorInfo/properties/details/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate19.errors = [{instancePath:instancePath+"/error",schemaPath:"#/components/schemas/ErrorInfo/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.request_id !== undefined){
const _errs21 = errors;
if(typeof data.request_id !== "string"){
validate19.errors = [{instancePath:instancePath+"/request_id",schemaPath:"#/properties/request_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate19.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate19.errors = vErrors;
return errors === 0;
}

export const JsonResult = validate20;
const schema23 = {"properties":{"text":{"type":"string","title":"Text"},"input_bytes":{"type":"integer","title":"Input Bytes"},"output_bytes":{"type":"integer","title":"Output Bytes"}},"additionalProperties":false,"type":"object","required":["text","input_bytes","output_bytes"],"title":"JsonResult"};

function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.text === undefined) && (missing0 = "text")) || ((data.input_bytes === undefined) && (missing0 = "input_bytes"))) || ((data.output_bytes === undefined) && (missing0 = "output_bytes"))){
validate20.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "text") || (key0 === "input_bytes")) || (key0 === "output_bytes"))){
validate20.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.text !== undefined){
const _errs2 = errors;
if(typeof data.text !== "string"){
validate20.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.input_bytes !== undefined){
let data1 = data.input_bytes;
const _errs4 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate20.errors = [{instancePath:instancePath+"/input_bytes",schemaPath:"#/properties/input_bytes/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.output_bytes !== undefined){
let data2 = data.output_bytes;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate20.errors = [{instancePath:instancePath+"/output_bytes",schemaPath:"#/properties/output_bytes/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate20.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate20.errors = vErrors;
return errors === 0;
}

export const SessionInfo = validate21;
const schema24 = {"properties":{"csrf_token":{"type":"string","title":"Csrf Token"},"expires_in":{"type":"integer","title":"Expires In"}},"additionalProperties":false,"type":"object","required":["csrf_token","expires_in"],"title":"SessionInfo"};

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.csrf_token === undefined) && (missing0 = "csrf_token")) || ((data.expires_in === undefined) && (missing0 = "expires_in"))){
validate21.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "csrf_token") || (key0 === "expires_in"))){
validate21.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.csrf_token !== undefined){
const _errs2 = errors;
if(typeof data.csrf_token !== "string"){
validate21.errors = [{instancePath:instancePath+"/csrf_token",schemaPath:"#/properties/csrf_token/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expires_in !== undefined){
let data1 = data.expires_in;
const _errs4 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate21.errors = [{instancePath:instancePath+"/expires_in",schemaPath:"#/properties/expires_in/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate21.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate21.errors = vErrors;
return errors === 0;
}

export const Health = validate22;
const schema25 = {"properties":{"status":{"type":"string","enum":["ok","ready"],"title":"Status"},"version":{"type":"string","title":"Version"}},"additionalProperties":false,"type":"object","required":["status","version"],"title":"Health"};

function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.status === undefined) && (missing0 = "status")) || ((data.version === undefined) && (missing0 = "version"))){
validate22.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "status") || (key0 === "version"))){
validate22.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.status !== undefined){
let data0 = data.status;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate22.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data0 === "ok") || (data0 === "ready"))){
validate22.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema25.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.version !== undefined){
const _errs4 = errors;
if(typeof data.version !== "string"){
validate22.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate22.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate22.errors = vErrors;
return errors === 0;
}

export const Preferences = validate23;
const schema26 = {"properties":{"version":{"type":"integer","const":1,"title":"Version","default":1},"theme":{"type":"string","enum":["light","dark"],"title":"Theme","default":"light"},"favorite_tools":{"items":{"type":"string","pattern":"^[a-z][a-z0-9]*(-[a-z0-9]+)*$"},"type":"array","maxItems":12,"title":"Favorite Tools"}},"additionalProperties":false,"type":"object","title":"Preferences"};

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "version") || (key0 === "theme")) || (key0 === "favorite_tools"))){
validate23.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.version !== undefined){
let data0 = data.version;
const _errs2 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate23.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(1 !== data0){
validate23.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.theme !== undefined){
let data1 = data.theme;
const _errs4 = errors;
if(typeof data1 !== "string"){
validate23.errors = [{instancePath:instancePath+"/theme",schemaPath:"#/properties/theme/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data1 === "light") || (data1 === "dark"))){
validate23.errors = [{instancePath:instancePath+"/theme",schemaPath:"#/properties/theme/enum",keyword:"enum",params:{allowedValues: schema26.properties.theme.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.favorite_tools !== undefined){
let data2 = data.favorite_tools;
const _errs6 = errors;
if(errors === _errs6){
if(Array.isArray(data2)){
if(data2.length > 12){
validate23.errors = [{instancePath:instancePath+"/favorite_tools",schemaPath:"#/properties/favorite_tools/maxItems",keyword:"maxItems",params:{limit: 12},message:"must NOT have more than 12 items"}];
return false;
}
else {
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
let data3 = data2[i0];
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(!pattern0.test(data3)){
validate23.errors = [{instancePath:instancePath+"/favorite_tools/" + i0,schemaPath:"#/properties/favorite_tools/items/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z][a-z0-9]*(-[a-z0-9]+)*$"+"\""}];
return false;
}
}
else {
validate23.errors = [{instancePath:instancePath+"/favorite_tools/" + i0,schemaPath:"#/properties/favorite_tools/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs8 === errors;
if(!valid1){
break;
}
}
}
}
else {
validate23.errors = [{instancePath:instancePath+"/favorite_tools",schemaPath:"#/properties/favorite_tools/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate23.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate23.errors = vErrors;
return errors === 0;
}

export const AiConnection = validate24;
const schema27 = {"properties":{"command":{"type":"string","title":"Command"},"args":{"items":{"type":"string"},"type":"array","title":"Args"},"env":{"additionalProperties":{"type":"string"},"type":"object","title":"Env"}},"additionalProperties":false,"type":"object","required":["command","args","env"],"title":"AiConnection"};

function validate24(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.command === undefined) && (missing0 = "command")) || ((data.args === undefined) && (missing0 = "args"))) || ((data.env === undefined) && (missing0 = "env"))){
validate24.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "command") || (key0 === "args")) || (key0 === "env"))){
validate24.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.command !== undefined){
const _errs2 = errors;
if(typeof data.command !== "string"){
validate24.errors = [{instancePath:instancePath+"/command",schemaPath:"#/properties/command/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.args !== undefined){
let data1 = data.args;
const _errs4 = errors;
if(errors === _errs4){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs6 = errors;
if(typeof data1[i0] !== "string"){
validate24.errors = [{instancePath:instancePath+"/args/" + i0,schemaPath:"#/properties/args/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs6 === errors;
if(!valid1){
break;
}
}
}
else {
validate24.errors = [{instancePath:instancePath+"/args",schemaPath:"#/properties/args/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.env !== undefined){
let data3 = data.env;
const _errs8 = errors;
if(errors === _errs8){
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
for(const key1 in data3){
const _errs11 = errors;
if(typeof data3[key1] !== "string"){
validate24.errors = [{instancePath:instancePath+"/env/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/env/additionalProperties/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs11 === errors;
if(!valid2){
break;
}
}
}
else {
validate24.errors = [{instancePath:instancePath+"/env",schemaPath:"#/properties/env/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate24.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate24.errors = vErrors;
return errors === 0;
}

export const DiffResult = validate25;
const schema28 = {"properties":{"text":{"type":"string","title":"Text"},"identical":{"type":"boolean","title":"Identical"},"added_lines":{"type":"integer","title":"Added Lines"},"removed_lines":{"type":"integer","title":"Removed Lines"}},"additionalProperties":false,"type":"object","required":["text","identical","added_lines","removed_lines"],"title":"DiffResult"};

function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.text === undefined) && (missing0 = "text")) || ((data.identical === undefined) && (missing0 = "identical"))) || ((data.added_lines === undefined) && (missing0 = "added_lines"))) || ((data.removed_lines === undefined) && (missing0 = "removed_lines"))){
validate25.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "text") || (key0 === "identical")) || (key0 === "added_lines")) || (key0 === "removed_lines"))){
validate25.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.text !== undefined){
const _errs2 = errors;
if(typeof data.text !== "string"){
validate25.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.identical !== undefined){
const _errs4 = errors;
if(typeof data.identical !== "boolean"){
validate25.errors = [{instancePath:instancePath+"/identical",schemaPath:"#/properties/identical/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.added_lines !== undefined){
let data2 = data.added_lines;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate25.errors = [{instancePath:instancePath+"/added_lines",schemaPath:"#/properties/added_lines/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.removed_lines !== undefined){
let data3 = data.removed_lines;
const _errs8 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate25.errors = [{instancePath:instancePath+"/removed_lines",schemaPath:"#/properties/removed_lines/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate25.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate25.errors = vErrors;
return errors === 0;
}

export const JsonLinesResult = validate26;
const schema29 = {"properties":{"text":{"type":"string","title":"Text"},"records":{"type":"integer","title":"Records"}},"additionalProperties":false,"type":"object","required":["text","records"],"title":"JsonLinesResult"};

function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.text === undefined) && (missing0 = "text")) || ((data.records === undefined) && (missing0 = "records"))){
validate26.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "text") || (key0 === "records"))){
validate26.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.text !== undefined){
const _errs2 = errors;
if(typeof data.text !== "string"){
validate26.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.records !== undefined){
let data1 = data.records;
const _errs4 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate26.errors = [{instancePath:instancePath+"/records",schemaPath:"#/properties/records/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate26.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate26.errors = vErrors;
return errors === 0;
}

export const CodecResult = validate27;
const schema30 = {"properties":{"text":{"type":"string","title":"Text"},"input_bytes":{"type":"integer","title":"Input Bytes"},"output_bytes":{"type":"integer","title":"Output Bytes"}},"additionalProperties":false,"type":"object","required":["text","input_bytes","output_bytes"],"title":"CodecResult"};

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.text === undefined) && (missing0 = "text")) || ((data.input_bytes === undefined) && (missing0 = "input_bytes"))) || ((data.output_bytes === undefined) && (missing0 = "output_bytes"))){
validate27.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "text") || (key0 === "input_bytes")) || (key0 === "output_bytes"))){
validate27.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.text !== undefined){
const _errs2 = errors;
if(typeof data.text !== "string"){
validate27.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.input_bytes !== undefined){
let data1 = data.input_bytes;
const _errs4 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate27.errors = [{instancePath:instancePath+"/input_bytes",schemaPath:"#/properties/input_bytes/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.output_bytes !== undefined){
let data2 = data.output_bytes;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate27.errors = [{instancePath:instancePath+"/output_bytes",schemaPath:"#/properties/output_bytes/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate27.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate27.errors = vErrors;
return errors === 0;
}

export const CodexStatus = validate28;
const schema31 = {"properties":{"available":{"type":"boolean","title":"Available"},"configured":{"type":"boolean","title":"Configured"},"matching":{"type":"boolean","title":"Matching"},"message":{"type":"string","title":"Message"},"configuration":{"type":"string","title":"Configuration"}},"additionalProperties":false,"type":"object","required":["available","configured","matching","message","configuration"],"title":"CodexStatus"};

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.available === undefined) && (missing0 = "available")) || ((data.configured === undefined) && (missing0 = "configured"))) || ((data.matching === undefined) && (missing0 = "matching"))) || ((data.message === undefined) && (missing0 = "message"))) || ((data.configuration === undefined) && (missing0 = "configuration"))){
validate28.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "available") || (key0 === "configured")) || (key0 === "matching")) || (key0 === "message")) || (key0 === "configuration"))){
validate28.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.available !== undefined){
const _errs2 = errors;
if(typeof data.available !== "boolean"){
validate28.errors = [{instancePath:instancePath+"/available",schemaPath:"#/properties/available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.configured !== undefined){
const _errs4 = errors;
if(typeof data.configured !== "boolean"){
validate28.errors = [{instancePath:instancePath+"/configured",schemaPath:"#/properties/configured/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.matching !== undefined){
const _errs6 = errors;
if(typeof data.matching !== "boolean"){
validate28.errors = [{instancePath:instancePath+"/matching",schemaPath:"#/properties/matching/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
const _errs8 = errors;
if(typeof data.message !== "string"){
validate28.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.configuration !== undefined){
const _errs10 = errors;
if(typeof data.configuration !== "string"){
validate28.errors = [{instancePath:instancePath+"/configuration",schemaPath:"#/properties/configuration/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate28.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate28.errors = vErrors;
return errors === 0;
}

export const ConnectionTest = validate29;
const schema32 = {"properties":{"connected":{"type":"boolean","const":true,"title":"Connected","default":true},"tool_count":{"type":"integer","title":"Tool Count"},"tested_operations":{"items":{"type":"string"},"type":"array","title":"Tested Operations"},"message":{"type":"string","title":"Message"}},"additionalProperties":false,"type":"object","required":["tool_count","tested_operations","message"],"title":"ConnectionTest"};

function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.tool_count === undefined) && (missing0 = "tool_count")) || ((data.tested_operations === undefined) && (missing0 = "tested_operations"))) || ((data.message === undefined) && (missing0 = "message"))){
validate29.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "connected") || (key0 === "tool_count")) || (key0 === "tested_operations")) || (key0 === "message"))){
validate29.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.connected !== undefined){
let data0 = data.connected;
const _errs2 = errors;
if(typeof data0 !== "boolean"){
validate29.errors = [{instancePath:instancePath+"/connected",schemaPath:"#/properties/connected/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
if(true !== data0){
validate29.errors = [{instancePath:instancePath+"/connected",schemaPath:"#/properties/connected/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tool_count !== undefined){
let data1 = data.tool_count;
const _errs4 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate29.errors = [{instancePath:instancePath+"/tool_count",schemaPath:"#/properties/tool_count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tested_operations !== undefined){
let data2 = data.tested_operations;
const _errs6 = errors;
if(errors === _errs6){
if(Array.isArray(data2)){
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs8 = errors;
if(typeof data2[i0] !== "string"){
validate29.errors = [{instancePath:instancePath+"/tested_operations/" + i0,schemaPath:"#/properties/tested_operations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs8 === errors;
if(!valid1){
break;
}
}
}
else {
validate29.errors = [{instancePath:instancePath+"/tested_operations",schemaPath:"#/properties/tested_operations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
const _errs10 = errors;
if(typeof data.message !== "string"){
validate29.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate29.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate29.errors = vErrors;
return errors === 0;
}

export const Artifact = validate30;
const schema33 = {"properties":{"artifact_id":{"type":"string","pattern":"^[a-f0-9]{32}$","title":"Artifact Id"},"name":{"type":"string","title":"Name"},"size":{"type":"integer","title":"Size"},"media_type":{"type":"string","title":"Media Type"},"info":{"$ref":"#/components/schemas/MediaInfo"},"shared_with_ai":{"type":"boolean","title":"Shared With Ai","default":false},"source_type":{"type":"string","enum":["managed","local"],"title":"Source Type","description":"managed 为资源库副本；local 为本机原文件只读引用","default":"managed"},"persistent":{"type":"boolean","title":"Persistent","description":"资源库副本是否长期保留；本机原文件引用始终保留至手动移除","default":false},"available":{"type":"boolean","title":"Available","description":"源文件当前是否可读取","default":true}},"additionalProperties":false,"type":"object","required":["artifact_id","name","size","media_type","info"],"title":"Artifact"};
const schema34 = {"properties":{"kind":{"type":"string","enum":["image","video","audio","subtitle"],"title":"Kind"},"width":{"type":"integer","title":"Width","default":0},"height":{"type":"integer","title":"Height","default":0},"duration":{"type":"number","title":"Duration","default":0},"has_audio":{"type":"boolean","title":"Has Audio","default":false},"frame_rate":{"type":"number","maximum":120,"minimum":0,"title":"Frame Rate","description":"视频平均帧率；旧记录或未知帧率为 0，组合输出回退到 30 fps","default":0}},"additionalProperties":false,"type":"object","required":["kind"],"title":"MediaInfo"};
const pattern7 = new RegExp("^[a-f0-9]{32}$", "u");

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.artifact_id === undefined) && (missing0 = "artifact_id")) || ((data.name === undefined) && (missing0 = "name"))) || ((data.size === undefined) && (missing0 = "size"))) || ((data.media_type === undefined) && (missing0 = "media_type"))) || ((data.info === undefined) && (missing0 = "info"))){
validate30.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func2.call(schema33.properties, key0))){
validate30.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.artifact_id !== undefined){
let data0 = data.artifact_id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(!pattern7.test(data0)){
validate30.errors = [{instancePath:instancePath+"/artifact_id",schemaPath:"#/properties/artifact_id/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{32}$"},message:"must match pattern \""+"^[a-f0-9]{32}$"+"\""}];
return false;
}
}
else {
validate30.errors = [{instancePath:instancePath+"/artifact_id",schemaPath:"#/properties/artifact_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
const _errs4 = errors;
if(typeof data.name !== "string"){
validate30.errors = [{instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.size !== undefined){
let data2 = data.size;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate30.errors = [{instancePath:instancePath+"/size",schemaPath:"#/properties/size/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.media_type !== undefined){
const _errs8 = errors;
if(typeof data.media_type !== "string"){
validate30.errors = [{instancePath:instancePath+"/media_type",schemaPath:"#/properties/media_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.info !== undefined){
let data4 = data.info;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if((data4.kind === undefined) && (missing1 = "kind")){
validate30.errors = [{instancePath:instancePath+"/info",schemaPath:"#/components/schemas/MediaInfo/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs13 = errors;
for(const key1 in data4){
if(!((((((key1 === "kind") || (key1 === "width")) || (key1 === "height")) || (key1 === "duration")) || (key1 === "has_audio")) || (key1 === "frame_rate"))){
validate30.errors = [{instancePath:instancePath+"/info",schemaPath:"#/components/schemas/MediaInfo/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs13 === errors){
if(data4.kind !== undefined){
let data5 = data4.kind;
const _errs14 = errors;
if(typeof data5 !== "string"){
validate30.errors = [{instancePath:instancePath+"/info/kind",schemaPath:"#/components/schemas/MediaInfo/properties/kind/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data5 === "image") || (data5 === "video")) || (data5 === "audio")) || (data5 === "subtitle"))){
validate30.errors = [{instancePath:instancePath+"/info/kind",schemaPath:"#/components/schemas/MediaInfo/properties/kind/enum",keyword:"enum",params:{allowedValues: schema34.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.width !== undefined){
let data6 = data4.width;
const _errs16 = errors;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
validate30.errors = [{instancePath:instancePath+"/info/width",schemaPath:"#/components/schemas/MediaInfo/properties/width/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid2 = _errs16 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.height !== undefined){
let data7 = data4.height;
const _errs18 = errors;
if(!((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7)))){
validate30.errors = [{instancePath:instancePath+"/info/height",schemaPath:"#/components/schemas/MediaInfo/properties/height/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid2 = _errs18 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.duration !== undefined){
const _errs20 = errors;
if(!(typeof data4.duration == "number")){
validate30.errors = [{instancePath:instancePath+"/info/duration",schemaPath:"#/components/schemas/MediaInfo/properties/duration/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs20 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.has_audio !== undefined){
const _errs22 = errors;
if(typeof data4.has_audio !== "boolean"){
validate30.errors = [{instancePath:instancePath+"/info/has_audio",schemaPath:"#/components/schemas/MediaInfo/properties/has_audio/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid2 = _errs22 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.frame_rate !== undefined){
let data10 = data4.frame_rate;
const _errs24 = errors;
if(errors === _errs24){
if(typeof data10 == "number"){
if(data10 > 120 || isNaN(data10)){
validate30.errors = [{instancePath:instancePath+"/info/frame_rate",schemaPath:"#/components/schemas/MediaInfo/properties/frame_rate/maximum",keyword:"maximum",params:{comparison: "<=", limit: 120},message:"must be <= 120"}];
return false;
}
else {
if(data10 < 0 || isNaN(data10)){
validate30.errors = [{instancePath:instancePath+"/info/frame_rate",schemaPath:"#/components/schemas/MediaInfo/properties/frame_rate/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate30.errors = [{instancePath:instancePath+"/info/frame_rate",schemaPath:"#/components/schemas/MediaInfo/properties/frame_rate/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid2 = _errs24 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
}
}
else {
validate30.errors = [{instancePath:instancePath+"/info",schemaPath:"#/components/schemas/MediaInfo/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.shared_with_ai !== undefined){
const _errs26 = errors;
if(typeof data.shared_with_ai !== "boolean"){
validate30.errors = [{instancePath:instancePath+"/shared_with_ai",schemaPath:"#/properties/shared_with_ai/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source_type !== undefined){
let data12 = data.source_type;
const _errs28 = errors;
if(typeof data12 !== "string"){
validate30.errors = [{instancePath:instancePath+"/source_type",schemaPath:"#/properties/source_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data12 === "managed") || (data12 === "local"))){
validate30.errors = [{instancePath:instancePath+"/source_type",schemaPath:"#/properties/source_type/enum",keyword:"enum",params:{allowedValues: schema33.properties.source_type.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.persistent !== undefined){
const _errs30 = errors;
if(typeof data.persistent !== "boolean"){
validate30.errors = [{instancePath:instancePath+"/persistent",schemaPath:"#/properties/persistent/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.available !== undefined){
const _errs32 = errors;
if(typeof data.available !== "boolean"){
validate30.errors = [{instancePath:instancePath+"/available",schemaPath:"#/properties/available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate30.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate30.errors = vErrors;
return errors === 0;
}

export const ArtifactList = validate31;
const schema35 = {"properties":{"items":{"items":{"$ref":"#/components/schemas/Artifact"},"type":"array","title":"Items"}},"additionalProperties":false,"type":"object","required":["items"],"title":"ArtifactList"};

function validate31(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.items === undefined) && (missing0 = "items")){
validate31.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(key0 === "items")){
validate31.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.items !== undefined){
let data0 = data.items;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
const _errs4 = errors;
if(!(validate30(data0[i0], {instancePath:instancePath+"/items/" + i0,parentData:data0,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
}
}
}
}
else {
validate31.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate31.errors = vErrors;
return errors === 0;
}

export const Job = validate33;
const schema36 = {"properties":{"job_id":{"type":"string","pattern":"^[a-f0-9]{32}$","title":"Job Id"},"tool_id":{"type":"string","title":"Tool Id"},"status":{"type":"string","enum":["queued","running","cancel_requested","succeeded","failed","cancelled","interrupted"],"title":"Status"},"stage":{"type":"string","title":"Stage"},"created_at":{"type":"string","title":"Created At"},"result":{"anyOf":[{"$ref":"#/components/schemas/Artifact"},{"type":"null"}]},"error":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Error"},"speech_processing":{"anyOf":[{"$ref":"#/components/schemas/SpeechProcessing"},{"type":"null"}]},"video_processing":{"anyOf":[{"$ref":"#/components/schemas/VideoProcessing"},{"type":"null"}],"description":"视频完成时的实际编码方式；fallback=true 表示硬件失败后改用 CPU"}},"additionalProperties":false,"type":"object","required":["job_id","tool_id","status","stage","created_at"],"title":"Job"};
const schema37 = {"properties":{"engine":{"type":"string","enum":["whisper","edge","qwen"],"title":"Engine"},"device":{"type":"string","enum":["cpu","cuda","online"],"title":"Device"}},"additionalProperties":false,"type":"object","required":["engine","device"],"title":"SpeechProcessing"};
const schema38 = {"properties":{"backend":{"type":"string","enum":["cpu","nvenc","qsv","amf","videotoolbox","vaapi"],"title":"Backend"},"encoder":{"type":"string","title":"Encoder"},"label":{"type":"string","title":"Label"},"fallback":{"type":"boolean","title":"Fallback","default":false}},"additionalProperties":false,"type":"object","required":["backend","encoder","label"],"title":"VideoProcessing"};

function validate33(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.job_id === undefined) && (missing0 = "job_id")) || ((data.tool_id === undefined) && (missing0 = "tool_id"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.stage === undefined) && (missing0 = "stage"))) || ((data.created_at === undefined) && (missing0 = "created_at"))){
validate33.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func2.call(schema36.properties, key0))){
validate33.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.job_id !== undefined){
let data0 = data.job_id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(!pattern7.test(data0)){
validate33.errors = [{instancePath:instancePath+"/job_id",schemaPath:"#/properties/job_id/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{32}$"},message:"must match pattern \""+"^[a-f0-9]{32}$"+"\""}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/job_id",schemaPath:"#/properties/job_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tool_id !== undefined){
const _errs4 = errors;
if(typeof data.tool_id !== "string"){
validate33.errors = [{instancePath:instancePath+"/tool_id",schemaPath:"#/properties/tool_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data2 = data.status;
const _errs6 = errors;
if(typeof data2 !== "string"){
validate33.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data2 === "queued") || (data2 === "running")) || (data2 === "cancel_requested")) || (data2 === "succeeded")) || (data2 === "failed")) || (data2 === "cancelled")) || (data2 === "interrupted"))){
validate33.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema36.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stage !== undefined){
const _errs8 = errors;
if(typeof data.stage !== "string"){
validate33.errors = [{instancePath:instancePath+"/stage",schemaPath:"#/properties/stage/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.created_at !== undefined){
const _errs10 = errors;
if(typeof data.created_at !== "string"){
validate33.errors = [{instancePath:instancePath+"/created_at",schemaPath:"#/properties/created_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.result !== undefined){
let data5 = data.result;
const _errs12 = errors;
const _errs13 = errors;
let valid1 = false;
const _errs14 = errors;
if(!(validate30(data5, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var _valid0 = _errs14 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const _errs15 = errors;
if(data5 !== null){
const err0 = {instancePath:instancePath+"/result",schemaPath:"#/properties/result/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs15 === errors;
valid1 = valid1 || _valid0;
}
if(!valid1){
const err1 = {instancePath:instancePath+"/result",schemaPath:"#/properties/result/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
validate33.errors = vErrors;
return false;
}
else {
errors = _errs13;
if(vErrors !== null){
if(_errs13){
vErrors.length = _errs13;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.error !== undefined){
let data6 = data.error;
const _errs17 = errors;
const _errs18 = errors;
let valid2 = false;
const _errs19 = errors;
if(typeof data6 !== "string"){
const err2 = {instancePath:instancePath+"/error",schemaPath:"#/properties/error/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid1 = _errs19 === errors;
valid2 = valid2 || _valid1;
if(!valid2){
const _errs21 = errors;
if(data6 !== null){
const err3 = {instancePath:instancePath+"/error",schemaPath:"#/properties/error/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid1 = _errs21 === errors;
valid2 = valid2 || _valid1;
}
if(!valid2){
const err4 = {instancePath:instancePath+"/error",schemaPath:"#/properties/error/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate33.errors = vErrors;
return false;
}
else {
errors = _errs18;
if(vErrors !== null){
if(_errs18){
vErrors.length = _errs18;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.speech_processing !== undefined){
let data7 = data.speech_processing;
const _errs23 = errors;
const _errs24 = errors;
let valid3 = false;
const _errs25 = errors;
const _errs26 = errors;
if(errors === _errs26){
if(data7 && typeof data7 == "object" && !Array.isArray(data7)){
let missing1;
if(((data7.engine === undefined) && (missing1 = "engine")) || ((data7.device === undefined) && (missing1 = "device"))){
const err5 = {instancePath:instancePath+"/speech_processing",schemaPath:"#/components/schemas/SpeechProcessing/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
else {
const _errs28 = errors;
for(const key1 in data7){
if(!((key1 === "engine") || (key1 === "device"))){
const err6 = {instancePath:instancePath+"/speech_processing",schemaPath:"#/components/schemas/SpeechProcessing/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
break;
}
}
if(_errs28 === errors){
if(data7.engine !== undefined){
let data8 = data7.engine;
const _errs29 = errors;
if(typeof data8 !== "string"){
const err7 = {instancePath:instancePath+"/speech_processing/engine",schemaPath:"#/components/schemas/SpeechProcessing/properties/engine/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(!(((data8 === "whisper") || (data8 === "edge")) || (data8 === "qwen"))){
const err8 = {instancePath:instancePath+"/speech_processing/engine",schemaPath:"#/components/schemas/SpeechProcessing/properties/engine/enum",keyword:"enum",params:{allowedValues: schema37.properties.engine.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var valid5 = _errs29 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data7.device !== undefined){
let data9 = data7.device;
const _errs31 = errors;
if(typeof data9 !== "string"){
const err9 = {instancePath:instancePath+"/speech_processing/device",schemaPath:"#/components/schemas/SpeechProcessing/properties/device/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(!(((data9 === "cpu") || (data9 === "cuda")) || (data9 === "online"))){
const err10 = {instancePath:instancePath+"/speech_processing/device",schemaPath:"#/components/schemas/SpeechProcessing/properties/device/enum",keyword:"enum",params:{allowedValues: schema37.properties.device.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var valid5 = _errs31 === errors;
}
else {
var valid5 = true;
}
}
}
}
}
else {
const err11 = {instancePath:instancePath+"/speech_processing",schemaPath:"#/components/schemas/SpeechProcessing/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
var _valid2 = _errs25 === errors;
valid3 = valid3 || _valid2;
if(!valid3){
const _errs33 = errors;
if(data7 !== null){
const err12 = {instancePath:instancePath+"/speech_processing",schemaPath:"#/properties/speech_processing/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid2 = _errs33 === errors;
valid3 = valid3 || _valid2;
}
if(!valid3){
const err13 = {instancePath:instancePath+"/speech_processing",schemaPath:"#/properties/speech_processing/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
validate33.errors = vErrors;
return false;
}
else {
errors = _errs24;
if(vErrors !== null){
if(_errs24){
vErrors.length = _errs24;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.video_processing !== undefined){
let data10 = data.video_processing;
const _errs35 = errors;
const _errs36 = errors;
let valid6 = false;
const _errs37 = errors;
const _errs38 = errors;
if(errors === _errs38){
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
let missing2;
if((((data10.backend === undefined) && (missing2 = "backend")) || ((data10.encoder === undefined) && (missing2 = "encoder"))) || ((data10.label === undefined) && (missing2 = "label"))){
const err14 = {instancePath:instancePath+"/video_processing",schemaPath:"#/components/schemas/VideoProcessing/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
else {
const _errs40 = errors;
for(const key2 in data10){
if(!((((key2 === "backend") || (key2 === "encoder")) || (key2 === "label")) || (key2 === "fallback"))){
const err15 = {instancePath:instancePath+"/video_processing",schemaPath:"#/components/schemas/VideoProcessing/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
break;
}
}
if(_errs40 === errors){
if(data10.backend !== undefined){
let data11 = data10.backend;
const _errs41 = errors;
if(typeof data11 !== "string"){
const err16 = {instancePath:instancePath+"/video_processing/backend",schemaPath:"#/components/schemas/VideoProcessing/properties/backend/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(!((((((data11 === "cpu") || (data11 === "nvenc")) || (data11 === "qsv")) || (data11 === "amf")) || (data11 === "videotoolbox")) || (data11 === "vaapi"))){
const err17 = {instancePath:instancePath+"/video_processing/backend",schemaPath:"#/components/schemas/VideoProcessing/properties/backend/enum",keyword:"enum",params:{allowedValues: schema38.properties.backend.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var valid8 = _errs41 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data10.encoder !== undefined){
const _errs43 = errors;
if(typeof data10.encoder !== "string"){
const err18 = {instancePath:instancePath+"/video_processing/encoder",schemaPath:"#/components/schemas/VideoProcessing/properties/encoder/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var valid8 = _errs43 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data10.label !== undefined){
const _errs45 = errors;
if(typeof data10.label !== "string"){
const err19 = {instancePath:instancePath+"/video_processing/label",schemaPath:"#/components/schemas/VideoProcessing/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var valid8 = _errs45 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data10.fallback !== undefined){
const _errs47 = errors;
if(typeof data10.fallback !== "boolean"){
const err20 = {instancePath:instancePath+"/video_processing/fallback",schemaPath:"#/components/schemas/VideoProcessing/properties/fallback/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var valid8 = _errs47 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
}
}
else {
const err21 = {instancePath:instancePath+"/video_processing",schemaPath:"#/components/schemas/VideoProcessing/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
var _valid3 = _errs37 === errors;
valid6 = valid6 || _valid3;
if(!valid6){
const _errs49 = errors;
if(data10 !== null){
const err22 = {instancePath:instancePath+"/video_processing",schemaPath:"#/properties/video_processing/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
var _valid3 = _errs49 === errors;
valid6 = valid6 || _valid3;
}
if(!valid6){
const err23 = {instancePath:instancePath+"/video_processing",schemaPath:"#/properties/video_processing/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
validate33.errors = vErrors;
return false;
}
else {
errors = _errs36;
if(vErrors !== null){
if(_errs36){
vErrors.length = _errs36;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate33.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate33.errors = vErrors;
return errors === 0;
}

export const JobList = validate35;
const schema39 = {"properties":{"items":{"items":{"$ref":"#/components/schemas/Job"},"type":"array","title":"Items"}},"additionalProperties":false,"type":"object","required":["items"],"title":"JobList"};

function validate35(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.items === undefined) && (missing0 = "items")){
validate35.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(key0 === "items")){
validate35.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.items !== undefined){
let data0 = data.items;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
const _errs4 = errors;
if(!(validate33(data0[i0], {instancePath:instancePath+"/items/" + i0,parentData:data0,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate35.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
}
}
}
}
else {
validate35.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate35.errors = vErrors;
return errors === 0;
}

export const ApprovalList = validate37;
const schema40 = {"properties":{"items":{"items":{"$ref":"#/components/schemas/Approval"},"type":"array","title":"Items"}},"additionalProperties":false,"type":"object","required":["items"],"title":"ApprovalList"};
const schema41 = {"properties":{"approval_id":{"type":"string","pattern":"^[a-f0-9]{32}$","title":"Approval Id"},"actor":{"type":"string","title":"Actor"},"operation":{"type":"string","title":"Operation"},"parameters_summary":{"type":"string","title":"Parameters Summary"},"expires_at":{"type":"string","title":"Expires At"},"status":{"type":"string","enum":["pending","approved","rejected","used"],"title":"Status"}},"additionalProperties":false,"type":"object","required":["approval_id","actor","operation","parameters_summary","expires_at","status"],"title":"Approval"};

function validate37(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.items === undefined) && (missing0 = "items")){
validate37.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(key0 === "items")){
validate37.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.items !== undefined){
let data0 = data.items;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if(((((((data1.approval_id === undefined) && (missing1 = "approval_id")) || ((data1.actor === undefined) && (missing1 = "actor"))) || ((data1.operation === undefined) && (missing1 = "operation"))) || ((data1.parameters_summary === undefined) && (missing1 = "parameters_summary"))) || ((data1.expires_at === undefined) && (missing1 = "expires_at"))) || ((data1.status === undefined) && (missing1 = "status"))){
validate37.errors = [{instancePath:instancePath+"/items/" + i0,schemaPath:"#/components/schemas/Approval/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key1 in data1){
if(!((((((key1 === "approval_id") || (key1 === "actor")) || (key1 === "operation")) || (key1 === "parameters_summary")) || (key1 === "expires_at")) || (key1 === "status"))){
validate37.errors = [{instancePath:instancePath+"/items/" + i0,schemaPath:"#/components/schemas/Approval/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data1.approval_id !== undefined){
let data2 = data1.approval_id;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(!pattern7.test(data2)){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/approval_id",schemaPath:"#/components/schemas/Approval/properties/approval_id/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{32}$"},message:"must match pattern \""+"^[a-f0-9]{32}$"+"\""}];
return false;
}
}
else {
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/approval_id",schemaPath:"#/components/schemas/Approval/properties/approval_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs8 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.actor !== undefined){
const _errs10 = errors;
if(typeof data1.actor !== "string"){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/actor",schemaPath:"#/components/schemas/Approval/properties/actor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs10 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.operation !== undefined){
const _errs12 = errors;
if(typeof data1.operation !== "string"){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/operation",schemaPath:"#/components/schemas/Approval/properties/operation/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs12 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.parameters_summary !== undefined){
const _errs14 = errors;
if(typeof data1.parameters_summary !== "string"){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/parameters_summary",schemaPath:"#/components/schemas/Approval/properties/parameters_summary/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs14 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.expires_at !== undefined){
const _errs16 = errors;
if(typeof data1.expires_at !== "string"){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/expires_at",schemaPath:"#/components/schemas/Approval/properties/expires_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs16 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.status !== undefined){
let data7 = data1.status;
const _errs18 = errors;
if(typeof data7 !== "string"){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/status",schemaPath:"#/components/schemas/Approval/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data7 === "pending") || (data7 === "approved")) || (data7 === "rejected")) || (data7 === "used"))){
validate37.errors = [{instancePath:instancePath+"/items/" + i0+"/status",schemaPath:"#/components/schemas/Approval/properties/status/enum",keyword:"enum",params:{allowedValues: schema41.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs18 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/items/" + i0,schemaPath:"#/components/schemas/Approval/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
}
}
}
}
else {
validate37.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate37.errors = vErrors;
return errors === 0;
}

export const MediaEnvironment = validate38;
const schema42 = {"properties":{"available":{"type":"boolean","title":"Available"},"version":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Version"},"message":{"type":"string","title":"Message"},"video_acceleration":{"anyOf":[{"$ref":"#/components/schemas/VideoAcceleration"},{"type":"null"}]}},"additionalProperties":false,"type":"object","required":["available","message"],"title":"MediaEnvironment"};
const schema43 = {"properties":{"backend":{"type":"string","enum":["cpu","nvenc","qsv","amf","videotoolbox","vaapi"],"title":"Backend"},"encoder":{"type":"string","title":"Encoder"},"label":{"type":"string","title":"Label"},"fallback":{"type":"boolean","title":"Fallback","default":false},"checked_at":{"type":"string","title":"Checked At"},"cached":{"type":"boolean","title":"Cached","default":false},"cache_warning":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Cache Warning"}},"additionalProperties":false,"type":"object","required":["backend","encoder","label","checked_at"],"title":"VideoAcceleration"};

function validate38(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.available === undefined) && (missing0 = "available")) || ((data.message === undefined) && (missing0 = "message"))){
validate38.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "available") || (key0 === "version")) || (key0 === "message")) || (key0 === "video_acceleration"))){
validate38.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.available !== undefined){
const _errs2 = errors;
if(typeof data.available !== "boolean"){
validate38.errors = [{instancePath:instancePath+"/available",schemaPath:"#/properties/available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.version !== undefined){
let data1 = data.version;
const _errs4 = errors;
const _errs5 = errors;
let valid1 = false;
const _errs6 = errors;
if(typeof data1 !== "string"){
const err0 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs6 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const _errs8 = errors;
if(data1 !== null){
const err1 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var _valid0 = _errs8 === errors;
valid1 = valid1 || _valid0;
}
if(!valid1){
const err2 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate38.errors = vErrors;
return false;
}
else {
errors = _errs5;
if(vErrors !== null){
if(_errs5){
vErrors.length = _errs5;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
const _errs10 = errors;
if(typeof data.message !== "string"){
validate38.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.video_acceleration !== undefined){
let data3 = data.video_acceleration;
const _errs12 = errors;
const _errs13 = errors;
let valid2 = false;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
let missing1;
if(((((data3.backend === undefined) && (missing1 = "backend")) || ((data3.encoder === undefined) && (missing1 = "encoder"))) || ((data3.label === undefined) && (missing1 = "label"))) || ((data3.checked_at === undefined) && (missing1 = "checked_at"))){
const err3 = {instancePath:instancePath+"/video_acceleration",schemaPath:"#/components/schemas/VideoAcceleration/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
const _errs17 = errors;
for(const key1 in data3){
if(!(((((((key1 === "backend") || (key1 === "encoder")) || (key1 === "label")) || (key1 === "fallback")) || (key1 === "checked_at")) || (key1 === "cached")) || (key1 === "cache_warning"))){
const err4 = {instancePath:instancePath+"/video_acceleration",schemaPath:"#/components/schemas/VideoAcceleration/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
break;
}
}
if(_errs17 === errors){
if(data3.backend !== undefined){
let data4 = data3.backend;
const _errs18 = errors;
if(typeof data4 !== "string"){
const err5 = {instancePath:instancePath+"/video_acceleration/backend",schemaPath:"#/components/schemas/VideoAcceleration/properties/backend/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(!((((((data4 === "cpu") || (data4 === "nvenc")) || (data4 === "qsv")) || (data4 === "amf")) || (data4 === "videotoolbox")) || (data4 === "vaapi"))){
const err6 = {instancePath:instancePath+"/video_acceleration/backend",schemaPath:"#/components/schemas/VideoAcceleration/properties/backend/enum",keyword:"enum",params:{allowedValues: schema43.properties.backend.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var valid4 = _errs18 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.encoder !== undefined){
const _errs20 = errors;
if(typeof data3.encoder !== "string"){
const err7 = {instancePath:instancePath+"/video_acceleration/encoder",schemaPath:"#/components/schemas/VideoAcceleration/properties/encoder/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
var valid4 = _errs20 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.label !== undefined){
const _errs22 = errors;
if(typeof data3.label !== "string"){
const err8 = {instancePath:instancePath+"/video_acceleration/label",schemaPath:"#/components/schemas/VideoAcceleration/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var valid4 = _errs22 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.fallback !== undefined){
const _errs24 = errors;
if(typeof data3.fallback !== "boolean"){
const err9 = {instancePath:instancePath+"/video_acceleration/fallback",schemaPath:"#/components/schemas/VideoAcceleration/properties/fallback/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var valid4 = _errs24 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.checked_at !== undefined){
const _errs26 = errors;
if(typeof data3.checked_at !== "string"){
const err10 = {instancePath:instancePath+"/video_acceleration/checked_at",schemaPath:"#/components/schemas/VideoAcceleration/properties/checked_at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var valid4 = _errs26 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.cached !== undefined){
const _errs28 = errors;
if(typeof data3.cached !== "boolean"){
const err11 = {instancePath:instancePath+"/video_acceleration/cached",schemaPath:"#/components/schemas/VideoAcceleration/properties/cached/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
var valid4 = _errs28 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data3.cache_warning !== undefined){
let data10 = data3.cache_warning;
const _errs30 = errors;
const _errs31 = errors;
let valid5 = false;
const _errs32 = errors;
if(typeof data10 !== "string"){
const err12 = {instancePath:instancePath+"/video_acceleration/cache_warning",schemaPath:"#/components/schemas/VideoAcceleration/properties/cache_warning/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid2 = _errs32 === errors;
valid5 = valid5 || _valid2;
if(!valid5){
const _errs34 = errors;
if(data10 !== null){
const err13 = {instancePath:instancePath+"/video_acceleration/cache_warning",schemaPath:"#/components/schemas/VideoAcceleration/properties/cache_warning/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid2 = _errs34 === errors;
valid5 = valid5 || _valid2;
}
if(!valid5){
const err14 = {instancePath:instancePath+"/video_acceleration/cache_warning",schemaPath:"#/components/schemas/VideoAcceleration/properties/cache_warning/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
else {
errors = _errs31;
if(vErrors !== null){
if(_errs31){
vErrors.length = _errs31;
}
else {
vErrors = null;
}
}
}
var valid4 = _errs30 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
}
}
}
}
else {
const err15 = {instancePath:instancePath+"/video_acceleration",schemaPath:"#/components/schemas/VideoAcceleration/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
var _valid1 = _errs14 === errors;
valid2 = valid2 || _valid1;
if(!valid2){
const _errs36 = errors;
if(data3 !== null){
const err16 = {instancePath:instancePath+"/video_acceleration",schemaPath:"#/properties/video_acceleration/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var _valid1 = _errs36 === errors;
valid2 = valid2 || _valid1;
}
if(!valid2){
const err17 = {instancePath:instancePath+"/video_acceleration",schemaPath:"#/properties/video_acceleration/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate38.errors = vErrors;
return false;
}
else {
errors = _errs13;
if(vErrors !== null){
if(_errs13){
vErrors.length = _errs13;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate38.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate38.errors = vErrors;
return errors === 0;
}

export const SpeechEnvironment = validate39;
const schema44 = {"properties":{"whisper_available":{"type":"boolean","title":"Whisper Available"},"whisper_models":{"items":{"type":"string"},"type":"array","title":"Whisper Models"},"qwen_available":{"type":"boolean","title":"Qwen Available"},"edge_available":{"type":"boolean","title":"Edge Available"},"preferred_engine":{"type":"string","enum":["qwen","edge"],"title":"Preferred Engine"},"message":{"type":"string","title":"Message"},"whisper_url":{"type":"string","title":"Whisper Url","default":"https://github.com/openai/whisper"},"qwen_url":{"type":"string","title":"Qwen Url","default":"https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"},"runtime_url":{"type":"string","title":"Runtime Url","default":"https://github.com/QwenLM/Qwen3-TTS"}},"additionalProperties":false,"type":"object","required":["whisper_available","whisper_models","qwen_available","edge_available","preferred_engine","message"],"title":"SpeechEnvironment"};

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.whisper_available === undefined) && (missing0 = "whisper_available")) || ((data.whisper_models === undefined) && (missing0 = "whisper_models"))) || ((data.qwen_available === undefined) && (missing0 = "qwen_available"))) || ((data.edge_available === undefined) && (missing0 = "edge_available"))) || ((data.preferred_engine === undefined) && (missing0 = "preferred_engine"))) || ((data.message === undefined) && (missing0 = "message"))){
validate39.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func2.call(schema44.properties, key0))){
validate39.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.whisper_available !== undefined){
const _errs2 = errors;
if(typeof data.whisper_available !== "boolean"){
validate39.errors = [{instancePath:instancePath+"/whisper_available",schemaPath:"#/properties/whisper_available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.whisper_models !== undefined){
let data1 = data.whisper_models;
const _errs4 = errors;
if(errors === _errs4){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs6 = errors;
if(typeof data1[i0] !== "string"){
validate39.errors = [{instancePath:instancePath+"/whisper_models/" + i0,schemaPath:"#/properties/whisper_models/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs6 === errors;
if(!valid1){
break;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/whisper_models",schemaPath:"#/properties/whisper_models/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.qwen_available !== undefined){
const _errs8 = errors;
if(typeof data.qwen_available !== "boolean"){
validate39.errors = [{instancePath:instancePath+"/qwen_available",schemaPath:"#/properties/qwen_available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.edge_available !== undefined){
const _errs10 = errors;
if(typeof data.edge_available !== "boolean"){
validate39.errors = [{instancePath:instancePath+"/edge_available",schemaPath:"#/properties/edge_available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.preferred_engine !== undefined){
let data5 = data.preferred_engine;
const _errs12 = errors;
if(typeof data5 !== "string"){
validate39.errors = [{instancePath:instancePath+"/preferred_engine",schemaPath:"#/properties/preferred_engine/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data5 === "qwen") || (data5 === "edge"))){
validate39.errors = [{instancePath:instancePath+"/preferred_engine",schemaPath:"#/properties/preferred_engine/enum",keyword:"enum",params:{allowedValues: schema44.properties.preferred_engine.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
const _errs14 = errors;
if(typeof data.message !== "string"){
validate39.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.whisper_url !== undefined){
const _errs16 = errors;
if(typeof data.whisper_url !== "string"){
validate39.errors = [{instancePath:instancePath+"/whisper_url",schemaPath:"#/properties/whisper_url/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.qwen_url !== undefined){
const _errs18 = errors;
if(typeof data.qwen_url !== "string"){
validate39.errors = [{instancePath:instancePath+"/qwen_url",schemaPath:"#/properties/qwen_url/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.runtime_url !== undefined){
const _errs20 = errors;
if(typeof data.runtime_url !== "string"){
validate39.errors = [{instancePath:instancePath+"/runtime_url",schemaPath:"#/properties/runtime_url/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate39.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate39.errors = vErrors;
return errors === 0;
}

