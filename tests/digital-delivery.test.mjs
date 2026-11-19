import test from "node:test";
import assert from "node:assert/strict";
import {
  deliveryOrderFromLedger,
  digitalDeliveryConfig,
  issueDigitalDownload,
  resolveDigitalDelivery,
} from "../supabase/functions/_shared/digital-delivery.mjs";
const order = { status:"DONE",providerVerified:true,persisted:true,test:false,refunded:false,
  sku:"SGE-EBOOK-KOI-25",productId:"koi-algorithms-guide",currency:"KRW",amount:30000 };
const assets = { [order.sku]:{bucket:"shop-digital-private",path:"koi-guide/v1/book.pdf"} };
const url="https://inftexpcnfinglwlrvsj.supabase.co/storage/v1/object/sign/shop-digital-private/koi-guide/v1/book.pdf?token=stub";
function storage({isPublic=false,fail=false}={}) {return {getBucket:async()=>({data:{public:isPublic}}),
  from:()=>({createSignedUrl:async(path,ttl,options)=>{assert.equal(ttl,900);assert.deepEqual(options,{download:true});return fail?{error:true}:{data:{signedUrl:url}};}})};}
const run=(changes={})=>issueDigitalDownload({order,assets,enabled:true,storage:storage(),now:0,...changes});
test("disabled by default",async()=>assert.equal((await issueDigitalDownload({order})).reason,"DELIVERY_DISABLED"));
test("unverified and unpersisted orders cannot download",async()=>{for(const key of ["providerVerified","persisted"])assert.equal((await run({order:{...order,[key]:false}})).reason,"UNVERIFIED_ORDER");});
test("test payments and refunded orders cannot download",async()=>{for(const change of [{test:true},{refunded:true}])assert.equal((await run({order:{...order,...change}})).reason,"TEST_OR_REFUNDED");});
test("price and currency mismatch fail closed",async()=>{for(const change of [{amount:1},{currency:"USD"},{productId:"other"}])assert.equal((await run({order:{...order,...change}})).reason,"ORDER_MISMATCH");});
test("missing file mapping does not invent a file",async()=>assert.equal((await run({assets:{}})).reason,"ASSET_NOT_CONFIGURED"));
test("public bucket is rejected",async()=>assert.equal((await run({storage:storage({isPublic:true})})).reason,"PRIVATE_BUCKET_REQUIRED"));
test("storage failure remains pending",async()=>assert.equal((await run({storage:storage({fail:true})})).reason,"SIGNING_FAILED"));
test("verified real order gets a 15 minute link",async()=>assert.deepEqual(await run(),{status:"ready",downloadUrl:url,expiresAt:"1970-01-01T00:15:00.000Z"}));

/* ---------- 환경변수 설정 ---------- */

test("activation is opt-in with the documented defaults",()=>{
  const off=digitalDeliveryConfig({});
  assert.equal(off.enabled,false);
  assert.deepEqual(off.assets["SGE-EBOOK-KOI-25"],{bucket:"shop-digital-private",path:"koi-guide/v1/book.pdf"});
  assert.equal(digitalDeliveryConfig({NICEPAY_DIGITAL_DELIVERY_ENABLED:" TRUE "}).enabled,true);
  for(const value of ["1","yes","on","truee","false","",null,undefined])
    assert.equal(digitalDeliveryConfig({NICEPAY_DIGITAL_DELIVERY_ENABLED:value}).enabled,false);
});
test("asset path can be overridden and blank means default",()=>{
  assert.equal(digitalDeliveryConfig({NICEPAY_EBOOK_ASSET_PATH:" koi-guide/v2/book.pdf "}).assets["SGE-EBOOK-KOI-25"].path,"koi-guide/v2/book.pdf");
  assert.equal(digitalDeliveryConfig({NICEPAY_EBOOK_ASSET_PATH:"   "}).assets["SGE-EBOOK-KOI-25"].path,"koi-guide/v1/book.pdf");
});
test("a tampered asset path still fails closed",async()=>{
  const delivery=await resolveDigitalDelivery({order,storage:storage(),env:{NICEPAY_DIGITAL_DELIVERY_ENABLED:"true",NICEPAY_EBOOK_ASSET_PATH:"../other/book.pdf"},now:0});
  assert.deepEqual(delivery,{status:"pending",reason:"ASSET_NOT_CONFIGURED"});
});

/* ---------- 원장 행 → 발급 주문 ---------- */

const ledgerRow={order_id:"SGE-ABC123-XY",product_id:"koi-algorithms-guide",sku:"SGE-EBOOK-KOI-25",status:"DONE",amount:30000,currency:"KRW"};
const liveRaw={provider:"nicepay",channelType:"LIVE",resultCode:"0000",nicepayStatus:"paid",tid:"TID1234567890"};
const on={NICEPAY_DIGITAL_DELIVERY_ENABLED:"true"};

test("live order on the ledger maps to a verifiable order",()=>{
  assert.deepEqual(deliveryOrderFromLedger(ledgerRow,liveRaw),
    {status:"DONE",sku:"SGE-EBOOK-KOI-25",productId:"koi-algorithms-guide",currency:"KRW",amount:30000,
     test:false,refunded:false,providerVerified:true,persisted:true});
});
test("live order on the ledger gets the link when enabled",async()=>{
  const delivery=await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,liveRaw),storage:storage(),env:on,now:0});
  assert.deepEqual(delivery,{status:"ready",downloadUrl:url,expiresAt:"1970-01-01T00:15:00.000Z"});
});
test("the same order stays pending while the flag is off",async()=>{
  for(const env of [{},{NICEPAY_DIGITAL_DELIVERY_ENABLED:"false"},{NICEPAY_DIGITAL_DELIVERY_ENABLED:"1"}]){
    assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,liveRaw),storage:storage(),env,now:0}),
      {status:"pending",reason:"DELIVERY_DISABLED"});
  }
});
test("sandbox, unlabelled and canceled rows are never delivered",async()=>{
  const cases=[
    [deliveryOrderFromLedger(ledgerRow,{...liveRaw,channelType:"TEST"}),"TEST_OR_REFUNDED"],
    [deliveryOrderFromLedger(ledgerRow,{...liveRaw,channelType:undefined}),"TEST_OR_REFUNDED"],
    [deliveryOrderFromLedger({...ledgerRow,status:"CANCELED"},liveRaw),"UNVERIFIED_ORDER"],
  ];
  for(const [mapped,reason] of cases)
    assert.deepEqual(await resolveDigitalDelivery({order:mapped,storage:storage(),env:on,now:0}),
      {status:"pending",reason});
});
test("a row without provider approval evidence is not delivered",async()=>{
  for(const raw of [{...liveRaw,provider:"toss"},{...liveRaw,resultCode:"0001"},{...liveRaw,nicepayStatus:"failed"}]){
    assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,raw),storage:storage(),env:on,now:0}),
      {status:"pending",reason:"UNVERIFIED_ORDER"});
  }
});
test("non-digital products and wrong amounts never get a link",async()=>{
  assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger({...ledgerRow,sku:"SGE-COURSE-KOI-ADV"},liveRaw),storage:storage(),env:on,now:0}),
    {status:"pending",reason:"NOT_DIGITAL_PRODUCT"});
  assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger({...ledgerRow,amount:3000},liveRaw),storage:storage(),env:on,now:0}),
    {status:"pending",reason:"ORDER_MISMATCH"});
});
test("storage problems and broken config become pending, never a throw",async()=>{
  assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,liveRaw),storage:storage({isPublic:true}),env:on,now:0}),
    {status:"pending",reason:"PRIVATE_BUCKET_REQUIRED"});
  assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,liveRaw),storage:{getBucket:async()=>{throw new Error("down");}},env:on,now:0}),
    {status:"pending",reason:"STORAGE_UNAVAILABLE"});
  const hostileEnv={get NICEPAY_DIGITAL_DELIVERY_ENABLED(){throw new Error("boom");}};
  assert.deepEqual(await resolveDigitalDelivery({order:deliveryOrderFromLedger(ledgerRow,liveRaw),storage:storage(),env:hostileEnv,now:0}),
    {status:"pending",reason:"DELIVERY_UNAVAILABLE"});
});
