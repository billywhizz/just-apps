int main (int argc, char** argv) {
  char* str = "1234";
  unsigned int val = 0;
  for (int i = 0; i < 50000000; i++) {
    val = atoi(str);
  }
  return 0;
}
