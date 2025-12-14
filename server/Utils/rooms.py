def private_room(user1, user2):
    user1 = int(user1)
    user2 = int(user2)
    return f"room_{min(user1, user2)}_{max(user1, user2)}"
