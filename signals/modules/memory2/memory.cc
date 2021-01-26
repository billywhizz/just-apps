#include "memory.h"

just::memory::buffer* just::memory::getBuffer(Local<ArrayBuffer> ab) {
  just::memory::buffer* buf = (just::memory::buffer*)ab->GetAlignedPointerFromInternalField(1);
  if (buf == NULL) {
    buf = new just::memory::buffer();
    std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
    buf->data = backing->Data();
    buf->len = backing->ByteLength();
    ab->SetAlignedPointerInInternalField(1, buf);
  }
  return buf;
}

static void ResetHandleAndSetFlag(const v8::WeakCallbackInfo<just::memory::rawBuffer>& data) {
  data.GetParameter()->buffer.Reset();
  delete data.GetParameter();
}

void just::memory::RawBuffer(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<ArrayBuffer> ab = args[0].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  just::memory::rawBuffer* buf = new just::memory::rawBuffer();
  buf->data = backing->Data();
  buf->len = backing->ByteLength();
  buf->buffer.Reset(isolate, ab);
  buf->buffer.SetWeak(buf, &ResetHandleAndSetFlag, v8::WeakCallbackType::kFinalizer);
  just::memory::buffers[just::memory::bcount] = buf;
  args.GetReturnValue().Set(Integer::New(isolate, just::memory::bcount++));
}

void just::memory::Test1(const FunctionCallbackInfo<Value> &args) {
  just::memory::rawBuffer* b = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), b->len));
}

void just::memory::Test2(const FunctionCallbackInfo<Value> &args) {
  Local<ArrayBuffer> buf = args[1].As<ArrayBuffer>();
  just::memory::buffer* b = getBuffer(buf);
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), b->len));
}

void just::memory::Test3(const FunctionCallbackInfo<Value> &args) {
  Local<ArrayBuffer> buf = args[1].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> backing = buf->GetBackingStore();
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), buf->ByteLength()));
}

void just::memory::GetInteger(const FunctionCallbackInfo<Value> &args) {
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), Local<Integer>::Cast(args[0])->Value() + 1));
}

void just::memory::Init(Isolate* isolate, Local<ObjectTemplate> target) {
  Local<ObjectTemplate> module = ObjectTemplate::New(isolate);
  SET_METHOD(isolate, module, "test1", Test1);
  SET_METHOD(isolate, module, "test2", Test2);
  SET_METHOD(isolate, module, "test3", Test3);
  SET_METHOD(isolate, module, "getInteger", GetInteger);
  SET_METHOD(isolate, module, "rawBuffer", RawBuffer);
  SET_MODULE(isolate, target, "memory", module);
}
