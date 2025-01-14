#!/usr/bin/env python3

# Scripting Aider, see https://aider.chat/docs/scripting.html
# Scripting API is unstable, this was developed with aider 0.71.1
# @author Sam Reid (PhET Interactive Simulations)

import sys

from aider.coders import Coder
from aider.io import InputOutput
from aider.models import Model


def main():
    # Check if at least two arguments were passed: one for instructions, one for at least one file
    if len(sys.argv) < 3:
        print("Usage: python script.py <instructions.txt> <file1> [<file2> ...]")
        sys.exit(1)

    # The first argument is the instructions file.
    instructions_file = sys.argv[1]
    # The rest of the arguments are files to edit.
    fnames = sys.argv[2:]

    # Read the instructions from the file.
    try:
        with open(instructions_file, 'r') as f:
            instructions = f.read()
    except Exception as e:
        print(f"Error reading instructions file '{instructions_file}': {e}")
        sys.exit(1)

    # Create an IO instance that bypasses confirmation prompts.
    # Setting yes=False means that any confirmation prompt will auto-answer "no".
    io = InputOutput(yes=False)

    model = Model("openrouter/deepseek/deepseek-chat")

    # Create the coder object. The io object is passed so that prompts are handled automatically.
    coder = Coder.create(
        main_model=model,
        fnames=fnames,
        io=io,
        auto_commits=False,
        auto_lint=False
    )

    # Run the instructions from the file.
    coder.run(instructions)

    # print hello world
    print("Hello, World!")


if __name__ == '__main__':
    main()
