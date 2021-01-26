void just::sys::ReadString(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  Local<ArrayBuffer> ab = args[0].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  char *data = static_cast<char *>(backing->Data());
  int len = backing->ByteLength();
  int argc = args.Length();
  if (argc > 1) {
    len = args[1]->Int32Value(context).ToChecked();
  }
  int off = 0;
  if (argc > 2) {
    off = args[2]->Int32Value(context).ToChecked();
  }
  char* source = data + off;
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, source, 
    NewStringType::kNormal, len).ToLocalChecked());
}

void just::sys::GetAddress(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<ArrayBuffer> ab = args[0].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  char *data = static_cast<char *>(backing->Data());
  args.GetReturnValue().Set(BigInt::New(isolate, (uint64_t)data));
}

void just::sys::WriteString(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  Local<ArrayBuffer> ab = args[0].As<ArrayBuffer>();
  Local<String> str = args[1].As<String>();
  int off = 0;
  if (args.Length() > 2) {
    off = args[2]->Int32Value(context).ToChecked();
  }
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  char *data = static_cast<char *>(backing->Data());
  char* source = data + off;
  int len = str->Utf8Length(isolate);
  int nchars = 0;
  int written = str->WriteUtf8(isolate, source, len, &nchars, v8::String::HINT_MANY_WRITES_EXPECTED | v8::String::NO_NULL_TERMINATION);
  args.GetReturnValue().Set(Integer::New(isolate, written));
}

void just::sys::Memcpy(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();

  Local<ArrayBuffer> abdest = args[0].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> bdest = abdest->GetBackingStore();
  char *dest = static_cast<char *>(bdest->Data());

  Local<ArrayBuffer> absource = args[1].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> bsource = absource->GetBackingStore();
  char *source = static_cast<char *>(bsource->Data());
  int slen = bsource->ByteLength();

  int argc = args.Length();
  int off = 0;
  if (argc > 2) {
    off = args[2]->Int32Value(context).ToChecked();
  }
  int len = slen;
  if (argc > 3) {
    len = args[3]->Int32Value(context).ToChecked();
  }
  int off2 = 0;
  if (argc > 4) {
    off2 = args[4]->Int32Value(context).ToChecked();
  }
  if (len == 0) return;
  dest = dest + off;
  source = source + off2;
  memcpy(dest, source, len);
  args.GetReturnValue().Set(Integer::New(isolate, len));
}

void just::sys::ReadMemory(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<BigInt> start64 = Local<BigInt>::Cast(args[0]);
  Local<BigInt> end64 = Local<BigInt>::Cast(args[1]);
  const uint64_t size = end64->Uint64Value() - start64->Uint64Value();
  void* start = reinterpret_cast<void*>(start64->Uint64Value());
  // TODO: is this correct? will it leak?
  // todo: we should pass the buffer in. change all code where we create objects like this
  std::unique_ptr<BackingStore> backing =
      ArrayBuffer::NewBackingStore(start, size, 
        just::UnwrapMemory, nullptr);
  Local<ArrayBuffer> ab =
      ArrayBuffer::New(isolate, std::move(backing));
  args.GetReturnValue().Set(ab);
}

void just::sys::ShmOpen(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  String::Utf8Value name(isolate, args[0]);
  int argc = args.Length();
  int flags = O_RDONLY;
  if (argc > 1) {
    flags = args[1]->Int32Value(context).ToChecked();
  }
  int mode = S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH;
  if (argc > 2) {
    mode = args[2]->Int32Value(context).ToChecked();
  }
  args.GetReturnValue().Set(Integer::New(isolate, shm_open(*name, flags, mode)));
}

void just::sys::ShmUnlink(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  String::Utf8Value name(isolate, args[0]);
  args.GetReturnValue().Set(Integer::New(isolate, shm_unlink(*name)));
}

void just::sys::MMap(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  int argc = args.Length();
  int fd = args[0]->Int32Value(context).ToChecked();
  int len = args[1]->Int32Value(context).ToChecked();
  int prot = PROT_READ | PROT_WRITE;
  int flags = MAP_SHARED;
  size_t offset = 0;
  if (argc > 2) {
    prot = args[2]->Int32Value(context).ToChecked();
  }
  if (argc > 3) {
    flags = args[3]->Int32Value(context).ToChecked();
  }
  if (argc > 4) {
    offset = args[4]->Int32Value(context).ToChecked();
  }
  void* data = mmap(0, len, prot, flags, fd, offset);
  if (data == MAP_FAILED) {
    return;
  }
  std::unique_ptr<BackingStore> backing =
      SharedArrayBuffer::NewBackingStore(data, len, 
        just::FreeMappedMemory, nullptr);
  Local<SharedArrayBuffer> ab =
      SharedArrayBuffer::New(isolate, std::move(backing));
  args.GetReturnValue().Set(ab);
}

void just::sys::MUnmap(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  Local<SharedArrayBuffer> ab = args[0].As<SharedArrayBuffer>();
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  int len = args[1]->Int32Value(context).ToChecked();
  int r = munmap(backing->Data(), len);
  args.GetReturnValue().Set(Integer::New(isolate, r));
}

void just::sys::Calloc(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  uint32_t count = args[0]->Uint32Value(context).ToChecked();
  uint32_t size = 0;
  void* chunk;
  if (args[1]->IsString()) {
    Local<String> str = args[1].As<String>();
    size = str->Utf8Length(isolate);
    chunk = calloc(count, size);
    int written;
    char* next = (char*)chunk;
    for (uint32_t i = 0; i < count; i++) {
      str->WriteUtf8(isolate, next, size, &written, 
        String::HINT_MANY_WRITES_EXPECTED | String::NO_NULL_TERMINATION);
      next += written;
    }
  } else {
    size = args[1]->Uint32Value(context).ToChecked();
    chunk = calloc(count, size);
  }
  bool shared = false;
  if (args.Length() > 2) {
    shared = args[2]->BooleanValue(isolate);
  }
  if (shared) {
    std::unique_ptr<BackingStore> backing =
        SharedArrayBuffer::NewBackingStore(chunk, count * size, 
          just::FreeMemory, nullptr);
    Local<SharedArrayBuffer> ab =
        SharedArrayBuffer::New(isolate, std::move(backing));
    args.GetReturnValue().Set(ab);
  } else {
    std::unique_ptr<BackingStore> backing =
        ArrayBuffer::NewBackingStore(chunk, count * size, just::FreeMemory, nullptr);
    Local<ArrayBuffer> ab =
        ArrayBuffer::New(isolate, std::move(backing));
    args.GetReturnValue().Set(ab);
  }
}

// called when we need to free the memory after the wrapping arraybuffer is gc'd
void just::FreeMemory(void* buf, size_t length, void* data) {
  free(buf);
  // todo: what do we do with *data?
}

// called when wrapping arraybuffer is gc'd and we don't want to free the underlying memory
void just::UnwrapMemory(void* buf, size_t length, void* data) {

}

// called when wrapping arraybuffer is gc'd and the underlying memory is mmaped
void just::FreeMappedMemory(void* buf, size_t length, void* data) {
  munmap(buf, length);
}
