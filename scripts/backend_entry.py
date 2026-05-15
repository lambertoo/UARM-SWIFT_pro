import sys
import argparse
import uvicorn

sys.path.insert(0, ".")

parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()

uvicorn.run("backend.main:app", host=args.host, port=args.port)
