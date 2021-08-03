(import (scheme base)
;        (scheme char)
;        (scheme lazy)
;        (scheme inexact)
;        (scheme complex)
;        (scheme time)
        (scheme file)
        (scheme read)
        (scheme write)
;        (scheme eval)
        (scheme process-context)
;        (scheme case-lambda)
;        (scheme r5rs)
;        (scheme repl) -- Note: No tests yet.
        (scheme cxr))

(test-begin "Files")

(define tempdir (get-environment-variable "MY_TEMPDIR"))
(unless tempdir (raise "NO TEMP DIR"))
(define temp-file-path (get-environment-variable "MY_FILE"))
(unless temp-file-path (raise "NO MY_FILE"))

(test #f (file-exists? temp-file-path))

(define wp (open-output-file temp-file-path))
(display "Lorem ipsum" wp)
(close-port wp)

(test #t (file-exists? temp-file-path));
(define rp (open-input-file temp-file-path))
(define rstr (read-line rp))
(test "Lorem ipsum" rstr)
(close-port rp)

(call-with-input-file temp-file-path
  (lambda (fp) (test "Lorem ipsum" (read-line fp))))

(delete-file temp-file-path)
(test #f (file-exists? temp-file-path));
(test #t
    (file-error? (guard (exn (else exn)) (delete-file temp-file-path))))

(call-with-output-file temp-file-path
  (lambda (fp) (display "Dororem sit" fp)))

(call-with-input-file temp-file-path
  (lambda (fp) (test "Dororem sit" (read-line fp))))

(with-input-from-file temp-file-path
  (lambda () (test "Dororem sit" (read-line))))

; write-char write-string newline write-string with index
(with-output-to-file temp-file-path
  (lambda () (write-char #\a)
              (write-char #\あ)
              (write-string "A")
              (newline)
              (write-string "bいBBBB" (current-output-port) 0 3)))

; read-line
(call-with-input-file temp-file-path
  (lambda (fp) (test "aあA" (read-line fp))
                (test "bいB" (read-line fp))
                (test #t (eof-object? (read-line fp)))))
(with-input-from-file temp-file-path
  (lambda () (test "aあA" (read-line))
              (test "bいB" (read-line))
              (test #t (eof-object? (read-line)))))

; read-char
(call-with-input-file temp-file-path
  (lambda (fp) (test #\a (read-char fp))
  							(test #\あ (read-char fp))
  							(test #\A (read-char fp))
  							(test #\newline (read-char fp))
  							(test #\b (read-char fp))
  							(test #\い (read-char fp))
  							(test #\B (read-char fp))
  							(test #t (eof-object? (read-char fp)))))
(with-input-from-file temp-file-path
  (lambda () (test #\a (read-char))
  							(test #\あ (read-char))
  							(test #\A (read-char))
  							(test #\newline (read-char))
  							(test #\b (read-char))
  							(test #\い (read-char))
  							(test #\B (read-char))
  							(test #t (eof-object? (read-char)))))

; peek-char
(call-with-input-file temp-file-path
  (lambda (fp) (test #\a (peek-char fp))
  							(test #\a (peek-char fp))
  							(test #\a (read-char fp))
  							(test #\あ (peek-char fp))
  							(test #\あ (read-char fp))
  							(test #\A (read-char fp))
  							(test #\newline (peek-char fp))
  							(test #\newline (read-char fp))))
(with-input-from-file temp-file-path
  (lambda () (test #\a (peek-char))
  							(test #\a (peek-char))
  							(test #\a (read-char))))

; read-string
(call-with-input-file temp-file-path
  (lambda (fp) (test "aあA\nb" (read-string 5 fp))
  							(test "いB" (read-string 5 fp))
  							(test #t (eof-object? (read-string 5 fp)))))
(with-input-from-file temp-file-path
  (lambda () (test "aあA\nb" (read-string 5))
  							(test "いB" (read-string 5))
  							(test #t (eof-object? (read-string 5)))))

; binary
(define bofp (open-binary-output-file temp-file-path))
(write-bytevector #u8(1 2 3 4) bofp)
(write-u8 5 bofp)
(write-u8 6 bofp)
(close-port bofp)

(define brfp (open-binary-input-file temp-file-path))
(test #u8(1 2 3 4 5 6) (read-bytevector 6 brfp))
(test (eof-object) (read-bytevector 6 brfp))
(close-port bofp)

(define brfp (open-binary-input-file temp-file-path))
(test 1 (read-u8 brfp))
(test 2 (peek-u8 brfp))
(test 2 (peek-u8 brfp))
(test 2 (read-u8 brfp))
(test 3 (read-u8 brfp))
(test 4 (read-u8 brfp))
(test 5 (read-u8 brfp))
(test 6 (read-u8 brfp))
(test (eof-object) (peek-u8 brfp))
(test (eof-object) (read-u8 brfp))
(close-port bofp)

(define brfp (open-binary-input-file temp-file-path))
(define bvec (make-bytevector 4 255))
(test 2 (read-bytevector! bvec brfp 2))
(test 2 (read-bytevector! bvec brfp 2))
(test 2 (read-bytevector! bvec brfp 2))
(test (eof-object) (read-bytevector! bvec brfp 2))
(test #u8(255 255 5 6) bvec)

(delete-file temp-file-path)

(test #t
    (file-error? (guard (exn (else exn)) (delete-file tempdir))))

(test-end)
