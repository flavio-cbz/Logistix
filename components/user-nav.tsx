// components/user-nav.tsx

interface UserNavProps {
  user: {
    username: string;
    email?: string;
    avatar?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
        {user.avatar ? (
          <img src={user.avatar} alt="Avatar" className="h-full w-full rounded-full" />
        ) : (
          <span className="text-sm font-medium text-gray-600">
            {user.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.username}</span>
        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
      </div>
    </div>
  );
}