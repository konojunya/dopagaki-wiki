package main
import "fmt"
func main() {
 var u uint8 = 255
 u++
 var i int8 = 127
 i++
 var stock uint8 = 0
 stock--
 var a int8 = 100
 var b int64 = int64(a)
 var x int16 = 300
 y := uint8(x)
 fmt.Printf("uint8 overflow=%d\nint8 overflow=%d\nuint8 underflow=%d\nwiden=%d\nnarrow=%d\n", u,i,stock,b,y)
 for _, n := range []uint{8,16,32,64} {
  max := uint64(1)<<(n-1)-1
  fmt.Printf("int%d min=-%d max=%d\n",n,max+1,max)
 }
}
