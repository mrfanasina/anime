   
def format_name(name):
    # Format the name by replacing underscores and dots with spaces, and remove text in []
    formated_name = ""
    b = False
    for c in name:
        if c == "[":
            b = True 
        if c == "]":
            b = False
            continue
        if b:
            continue
        formated_name += c
    return formated_name.replace('_', ' ').replace('.', ' ').strip()     
if __name__ == "__main__":
    print(format_name('[Fa] Attack.On.Titan_Fa [sjfk] fgh'))