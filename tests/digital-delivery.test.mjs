import test from "node:test";
import assert from "node:assert/strict";
import { issueDigitalDownload } from "../supabase/functions/_shared/digital-delivery.mjs";
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
