package storage
import("strings";"testing")
func TestLocalStore(t *testing.T){s,e:=NewLocal(t.TempDir());if e!=nil{t.Fatal(e)};if e=s.Save("safe-key",strings.NewReader("x"));e!=nil{t.Fatal(e)};f,e:=s.Open("safe-key");if e!=nil{t.Fatal(e)};f.Close();if _,e=s.Open("../bad");e==nil{t.Fatal("expected rejection")}}
