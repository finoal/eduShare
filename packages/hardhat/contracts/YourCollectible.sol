// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "./uilt.sol";

contract YourCollectible is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard,
    ERC721Royalty,
    uilt
{

    //追踪和生成唯一的ID
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter; // 唯一ID计数器
    Counters.Counter private _transactionCounter; // 交易顺序计数器

    uint256 public totalFeesCollected; // 收集的手续费


    // 用户模块
    struct User {
        string name; // 用户名
        bytes32 password; // 密码
        address payable wallet; // 钱包地址
        string avatar; // 头像
        string bio; // 个人简介
        uint256 integral; //积分
    }


    // 用户注册功能
    mapping(address => User) private  _users; // 用户映射

    function registerUser(string memory _name, string memory _password, string memory _avatar, string memory _bio) public {
        require(bytes(_name).length > 0);
        require(bytes(_users[msg.sender].name).length == 0, "User already registered");
        _users[msg.sender] = User(_name, stringToBytes32(_password), payable(msg.sender), _avatar, _bio, 0);
    }

    // 获取用户购买的教育资源列表
    function getUserPurchasedResources(address userAddress) public view returns (uint256[] memory) {
        uint256[] memory purchasedResources = new uint256[](_tokenIdCounter.current());
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _tokenIdCounter.current(); i++) {
            EduResource storage resource = _eduResources[i];
            for (uint256 j = 0; j < resource.buyers.length; j++) {
                if (resource.buyers[j] == userAddress) {
                    purchasedResources[count] = i;
                    count++;
                    break;
                }
            }
        }
        
        // 创建最终数组，只包含实际购买的资源
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = purchasedResources[i];
        }
        
        return result;
    }

    //用户登录
   function verifyPwd(address userAddress,string memory userName, string memory password) public view returns (bool, bool) {
        require(bytes(_users[userAddress].name).length != 0);
        
        User memory user = _users[userAddress];
        
        bool isNameValid = compareStrings(user.name, userName);
        bool isPwdValid = compareBytes32Strings(user.password, stringToBytes32(password));

        return (isNameValid && isPwdValid, false);
    }

    function updatePassword(string memory _newpassword,string memory _password) public {
        require(bytes(_users[msg.sender].name).length != 0);
        bool isPwdValid = compareBytes32Strings(_users[msg.sender].password, stringToBytes32(_password));
        require(isPwdValid, "Invalid password");
        _users[msg.sender].password = stringToBytes32(_newpassword);
    }

    function updateUserInfo(string memory avatar, string memory bio) public {
        require(bytes(_users[msg.sender].name).length != 0);
        _users[msg.sender].avatar = avatar;
        _users[msg.sender].bio = bio;
    }

    function getUserMessage(address userAddress) public view  returns (string memory, string memory, uint256, string memory) {
        User memory user = _users[userAddress];
        return (user.name, user.bio, user.integral, user.avatar);
    }

    // NFT数据结构
    // 教育资源数据结构
    struct Comment {
        uint256 id;          // 评论ID
        address author;      // 评论作者
        string content;      // 评论内容
        uint256 timestamp;   // 评论时间
        uint256 likes;       // 点赞数
        uint256[] replies;   // 回复评论的ID数组
        uint256 parentId;    // 父评论ID，0表示是主评论
    }

    struct EduResource {
        uint256 tokenId;     // 资源唯一ID
        uint256 price;       // 资源价格
        address payable creator; // 资源创建者
        bool isListed;       // 是否上架销售
        string eduUri;     // 教育封面URI
        string tokenUri;     // 资源元数据URI
        string resourceType; // 资源类型（视频、文档、课件等）
        string subject;      // 学科分类
        string educationLevel; // 教育阶段（小学、初中、高中等）
        uint256 downloadCount; // 下载次数
        uint256 rating;      // 评分总和
        uint256 ratingCount; // 评分人数
        uint256[] commentIds; // 评论ID数组
        bool isAccredited;   // 是否经过认证
        uint256 accreditedCount; // 认证次数
        address[] accreditedInstitutions; // 认证机构列表
        address[] buyers;    // 购买者集合
        uint256 creationTime; // 创建时间
        uint256 minRating;   // 最低评分要求
        string[] reviews;    // 评论内容数组
        address[] reviewers; // 评论者地址数组
    }

    // 添加资源访问控制修饰器
    modifier onlyResourceCreator(uint256 tokenId) {
        require(msg.sender == _eduResources[tokenId].creator);
        _;
    }


    // 用户积分奖励函数
    function rewardUserIntegral(address user, uint256 amount) internal {
        _users[user].integral += amount;
        emit Integral(user, 0, amount, block.timestamp);
    }

    // 教育资源相关映射
    mapping(uint256 => EduResource) private _eduResources; // 通过ID映射到教育资源
    // mapping(string => uint256[]) private _resourcesByType; // 按资源类型分类
    mapping(string => uint256[]) private _resourcesBySubject; // 按学科分类
    mapping(address => uint256[]) private _resourcesByAddress; // 按地址分类
    mapping (address => uint256[]) private _resourcesAddress; // 购买列表
    // mapping(string => uint256[]) private _resourcesByLevel; // 按教育阶段分类

    uint256 public listingFeePercentage = 250; // 2.5%
    uint256 public constant MAX_LISTING_FEE_PERCENTAGE = 1000; // 10%

    event NftListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp, uint256 transactionId);
    event NftUnlisted(uint256 transactionId, uint256 indexed tokenId, address indexed seller, uint256 timestamp);
    event NftPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp, uint256 transactionId);
    event ListingFeePercentageUpdated(uint256 newListingFeePercentage);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event RoyaltyPaid(uint256 transactionId, uint256 indexed tokenId, address indexed creator, uint256 amount, uint256 timestamp);
    event FeesReceived(address indexed sender, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 timestamp, bytes32 transactionId);
    event Integral(address indexed sender, uint256 tokenId, uint256 integral, uint256 timestamp);

    constructor() ERC721("YourCollectible", "LF") {
        // _tokenIdCounter.increment(); // 从1开始计数
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://gateway.pinata.cloud/ipfs/";
    }

    // 创建教育资源NFT
    function mintEducationalResource(
        address to,
        string memory eduUri,
        string memory uri,
        uint96 royaltyFeeNumber,
        string memory resourceType,
        string memory subject,
        string memory educationLevel
    ) public returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _setTokenRoyalty(tokenId, to, royaltyFeeNumber);
        string memory completeTokenURI = string(abi.encodePacked(_baseURI(), uri));
        _resourcesBySubject[subject].push(tokenId);
        _resourcesByAddress[msg.sender].push(tokenId);
        _eduResources[tokenId] = EduResource({
            tokenId: tokenId,
            price: 0,
            creator: payable(to),
            isListed: false,
            eduUri: eduUri,
            tokenUri: completeTokenURI,
            resourceType: resourceType,
            subject: subject,
            educationLevel: educationLevel,
            downloadCount: 0,
            rating: 0,
            ratingCount: 0,
            commentIds: new uint256[](0),
            isAccredited: false,
            accreditedCount: 0,
            accreditedInstitutions: new address[](0),
            buyers: new address[](0),
            creationTime: block.timestamp,
            minRating: 0,
            reviews: new string[](0),
            reviewers: new address[](0)
        });
        return tokenId;
    }
    // 上架教育资源
    function listEducationalResource(uint256 tokenId, uint256 price) external payable {
        require(price > 0, "Price must be greater than 0");
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(!_eduResources[tokenId].isListed, "edu is already listed");
        uint256 listingFee = calculateListingFee(price);
        require(msg.value >= calculateListingFee(price), "Insufficient listing fee");

        totalFeesCollected += listingFee;
        _eduResources[tokenId].price = price;
        _eduResources[tokenId].isListed = true;

        uint256 transactionId = _transactionCounter.current();
        _transactionCounter.increment();

        emit NftListed(tokenId, msg.sender, price, block.timestamp, transactionId);
    }

    // 下架教育资源
    function unlistEducationalResource(uint256 tokenId) external {
        EduResource storage item = _eduResources[tokenId];
        require(item.isListed);
        require(ownerOf(tokenId) == msg.sender);
        item.isListed = false;
        item.price = 0;

        uint256 transactionId = _transactionCounter.current();
        _transactionCounter.increment();

        emit NftUnlisted(transactionId,tokenId, msg.sender, block.timestamp);
    }



    // 购买教育资源
    function purchaseEducationalResource(uint256 tokenId) external payable nonReentrant {
        require(_eduResources[tokenId].isListed);
        require(msg.value >= _eduResources[tokenId].price);
        require(_eduResources[tokenId].creator != msg.sender);

        //判断是否已经购买了该教育资源
        for (uint256 i = 0; i < _eduResources[tokenId].buyers.length; i++) {
            if (_eduResources[tokenId].buyers[i] == msg.sender) {
                revert("You have already purchased this resource");
            }
        }
        // 增加下载次数
        _eduResources[tokenId].downloadCount += 1;       
        // 将购买者添加到购买者集合中
        _eduResources[tokenId].buyers.push(msg.sender);
        _resourcesAddress[msg.sender].push(tokenId);
        // 转账给创建者
        payable(_eduResources[tokenId].creator).transfer(_eduResources[tokenId].price);
        // // 处理版税
        // (address creator, uint256 royaltyAmount) = royaltyInfo(tokenId, msg.value);
        uint256 transactionId = _transactionCounter.current();
        // if (royaltyAmount > 0) {
        //     payable(creator).transfer(royaltyAmount);
        //     _transactionCounter.increment();
        //     emit RoyaltyPaid(transactionId, tokenId, creator, royaltyAmount, block.timestamp);
        // }
        _transactionCounter.increment();
        emit NftPurchased(tokenId, msg.sender, _eduResources[tokenId].creator, _eduResources[tokenId].price, block.timestamp, transactionId);      
    }


    event TransactionRecord(address indexed buyer, address indexed seller, uint256 tokenId, uint256 amount, uint256 timestamp, uint256 transactionId);

    // // 获取所有教育资源信息
    // function getAllEducationalResources() public view returns (EduResource[] memory) {
    //     uint256 total = _tokenIdCounter.current();

    //     EduResource[] memory resources = new EduResource[](total);
    //     for (uint256 i = 1; i <= total; i++) {
    //         resources[i] = _eduResources[i];
    //     }

    //     return resources;
    // }

    // 获取TokenId
    function getTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    // 获取教育资源信息
    function getEducationalResource(uint256 tokenId) public view returns (EduResource memory) {
        return _eduResources[tokenId];
    }

    // 按学科获取资源列表
    function getResourcesBySubject(string memory subject) public view returns (uint256[] memory) {
        return _resourcesBySubject[subject];
    }
    //通过地址获取资源列表
    function getResourcesByAddress(address userAddress) public view returns (EduResource[] memory) {
        uint256 totalBuy = _resourcesByAddress[userAddress].length;
        EduResource[] memory items = new EduResource[](totalBuy);

        for (uint256 i = 0; i < totalBuy; ++i) {
            uint256 tokenId = _resourcesByAddress[userAddress][i];
            items[i] = _eduResources[tokenId];
        }
        return items;
    }

    //获取指定地址购买的教育资源
    function getResourcesByBuy(address userAddress) public view returns (EduResource[] memory) {
        uint256 totalBuy = _resourcesAddress[userAddress].length;
        EduResource[] memory items = new EduResource[](totalBuy);

        for (uint256 i = 0; i < totalBuy; ++i) {
            uint256 tokenId = _resourcesAddress[userAddress][i];
            items[i] = _eduResources[tokenId];
        }
        return items;
    }

    // 评分功能
    function rateResource(uint256 tokenId, uint256 score) public {
        require(score >= 1 && score <= 5);
        // 检查用户是否已经在评分者列表中
        bool hasReviewed = false;
        for(uint i = 0; i < _eduResources[tokenId].reviewers.length; i++) {
            if(_eduResources[tokenId].reviewers[i] == msg.sender) {
                hasReviewed = true;
                break;
            }
        }
        require(!hasReviewed, "Already rated");

        _eduResources[tokenId].rating += score;
        _eduResources[tokenId].ratingCount += 1;
        _eduResources[tokenId].reviewers.push(msg.sender);
    }

    // 评论相关的状态变量
    Counters.Counter private _commentIdCounter;
    mapping(uint256 => Comment) private _comments;
    mapping(uint256 => mapping(address => bool)) private _commentLikes;

    // 评论相关的事件
    event CommentAdded(uint256 indexed tokenId, uint256 indexed commentId, address indexed author, string content, uint256 timestamp);
    event CommentLiked(uint256 indexed commentId, address indexed liker, uint256 newLikeCount);
    event CommentReplied(uint256 indexed parentCommentId, uint256 indexed replyCommentId, address indexed author);

    // 添加评论功能
    function addComment(uint256 tokenId, string memory content, uint256 parentId) public {
        require(bytes(content).length > 0);
        require(_exists(tokenId));
        
        // 如果是回复评论，检查父评论是否存在
        if (parentId != 0) {
            require(_comments[parentId].author != address(0));
            require(_comments[parentId].parentId == 0);
        }

        _commentIdCounter.increment();
        uint256 commentId = _commentIdCounter.current();

        Comment storage newComment = _comments[commentId];
        newComment.id = commentId;
        newComment.author = msg.sender;
        newComment.content = content;
        newComment.timestamp = block.timestamp;
        newComment.likes = 0;
        newComment.parentId = parentId;

        if (parentId != 0) {
            _comments[parentId].replies.push(commentId);
            emit CommentReplied(parentId, commentId, msg.sender);
        }

        _eduResources[tokenId].commentIds.push(commentId);
        // 评论奖励积分
        rewardUserIntegral(msg.sender, 1);
        emit CommentAdded(tokenId, commentId, msg.sender, content, block.timestamp);
    }

    // 点赞评论功能
    function likeComment(uint256 commentId) public {
        require(_comments[commentId].author != address(0));
        require(!_commentLikes[commentId][msg.sender]);
        require(_comments[commentId].author != msg.sender);

        _comments[commentId].likes += 1;
        _commentLikes[commentId][msg.sender] = true;

        emit CommentLiked(commentId, msg.sender, _comments[commentId].likes);
    }

    // 获取评论详情
    function getComment(uint256 commentId) public view returns (Comment memory) {
        require(_comments[commentId].author != address(0));
        return _comments[commentId];
    }

    // 获取资源的所有评论
    function getResourceComments(uint256 tokenId) public view returns (Comment[] memory) {
        uint256[] memory commentIds = _eduResources[tokenId].commentIds;
        Comment[] memory comments = new Comment[](commentIds.length);
        
        for (uint256 i = 0; i < commentIds.length; i++) {
            comments[i] = _comments[commentIds[i]];
        }
        
        return comments;
    }

    function setListingFeePercentage(uint256 _newListingFeePercentage) external onlyOwner { // 设置拍卖手续费百分比
        require(_newListingFeePercentage <= MAX_LISTING_FEE_PERCENTAGE);
        listingFeePercentage = _newListingFeePercentage;

        emit ListingFeePercentageUpdated(_newListingFeePercentage);
    }
    
    function calculateListingFee(uint256 priceInWei) public view returns (uint256) { // 计算拍卖手续费
        return (priceInWei * listingFeePercentage) / 10000;
    }

    function _beforeTokenTransfer( // 重写ERC721的_beforeTokenTransfer方法
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize); 
    } 

    function _burn( // 销毁NFT
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    function tokenURI( // 获取NFT的元数据
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface( // 检查合约是否支持某个接口
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // 提取平台手续费
    function withdrawFees() public onlyOwner {
        require(totalFeesCollected > 0);
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        (bool sent, ) = owner().call{value: amount}("");
        require(sent);
        emit FeesWithdrawn(owner(), amount);
    }
    
    // 更新上架手续费比例
    function updateListingFeePercentage(uint256 newPercentage) public onlyOwner {
        require(newPercentage <= MAX_LISTING_FEE_PERCENTAGE);
        listingFeePercentage = newPercentage;
        emit ListingFeePercentageUpdated(newPercentage);
    }
}