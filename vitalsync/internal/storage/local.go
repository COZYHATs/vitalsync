package storage

import (
 "fmt"
 "io"
 "os"
 "path/filepath"
 "strings"
)

type Store interface { Save(key string, r io.Reader) error; Open(key string) (*os.File, error) }
type Local struct { root string }
func NewLocal(root string) (*Local, error) { if err:=os.MkdirAll(root,0700); err!=nil{return nil,err}; return &Local{root:root},nil }
func valid(k string) bool { return k!="" && !strings.Contains(k,"/") && !strings.Contains(k,"\\") && !strings.Contains(k,"..") }
func (s *Local) path(k string)(string,error){if !valid(k){return "",fmt.Errorf("invalid storage key")};return filepath.Join(s.root,k),nil}
func (s *Local) Save(k string,r io.Reader) error { p,e:=s.path(k);if e!=nil{return e}; f,e:=os.OpenFile(p,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600);if e!=nil{return e};defer f.Close();_,e=io.Copy(f,r);return e }
func (s *Local) Open(k string)(*os.File,error){p,e:=s.path(k);if e!=nil{return nil,e};return os.Open(p)}
