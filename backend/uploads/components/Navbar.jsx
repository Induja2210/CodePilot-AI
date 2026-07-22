function Navbar() {
  return (
    <nav className="bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">

        {/* Logo */}
        <h1 className="text-2xl font-bold text-blue-400">
          CodePilot AI
        </h1>

        {/* Navigation Links */}
        <ul className="flex gap-8 text-lg">
          <li className="cursor-pointer hover:text-blue-400">Home</li>
          <li className="cursor-pointer hover:text-blue-400">Dashboard</li>
          <li className="cursor-pointer hover:text-blue-400">About</li>
        </ul>

      </div>
    </nav>
  );
}

export default Navbar;